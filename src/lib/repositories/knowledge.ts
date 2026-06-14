import { prisma } from "@/lib/db";
import { clamp } from "@/lib/utils";

function parseTerms(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export interface NodeView {
  id: string;
  label: string;
  summary: string;
  keyTerms: string[];
  importance: number;
  difficulty: number;
  mastery: number;
  sourceRef: string;
  documentId: string | null;
}

function toView(n: {
  id: string;
  label: string;
  summary: string;
  keyTerms: string;
  importance: number;
  difficulty: number;
  mastery: number;
  sourceRef: string;
  documentId: string | null;
}): NodeView {
  return { ...n, keyTerms: parseTerms(n.keyTerms) };
}

export const knowledgeRepo = {
  async createNodes(
    courseId: string,
    documentId: string | null,
    nodes: {
      label: string;
      summary: string;
      keyTerms: string[];
      importance: number;
      difficulty: number;
      sourceRef: string;
    }[]
  ) {
    const created = [];
    for (const n of nodes) {
      const node = await prisma.knowledgeNode.create({
        data: {
          courseId,
          documentId,
          label: n.label,
          summary: n.summary,
          keyTerms: JSON.stringify(n.keyTerms),
          importance: clamp(n.importance, 0, 1),
          difficulty: clamp(n.difficulty, 0, 1),
          sourceRef: n.sourceRef,
        },
      });
      created.push(node);
    }
    return created;
  },

  async createEdges(
    courseId: string,
    edges: { fromId: string; toId: string; relation: string; weight: number }[]
  ) {
    for (const e of edges) {
      if (e.fromId === e.toId) continue;
      await prisma.knowledgeEdge
        .create({
          data: {
            courseId,
            fromId: e.fromId,
            toId: e.toId,
            relation: e.relation,
            weight: clamp(e.weight, 0, 1),
          },
        })
        .catch(() => {}); // ignore duplicate edges (unique constraint)
    }
  },

  async listByCourse(courseId: string): Promise<NodeView[]> {
    const nodes = await prisma.knowledgeNode.findMany({
      where: { courseId },
      orderBy: { importance: "desc" },
    });
    return nodes.map(toView);
  },

  async graphForCourse(courseId: string) {
    const [nodes, edges] = await Promise.all([
      prisma.knowledgeNode.findMany({ where: { courseId } }),
      prisma.knowledgeEdge.findMany({ where: { courseId } }),
    ]);
    return { nodes: nodes.map(toView), edges };
  },

  async findForUser(id: string, userId: string): Promise<NodeView | null> {
    const node = await prisma.knowledgeNode.findFirst({
      where: { id, course: { userId } },
    });
    return node ? toView(node) : null;
  },

  async adjustMastery(id: string, delta: number) {
    const node = await prisma.knowledgeNode.findUnique({ where: { id } });
    if (!node) return;
    await prisma.knowledgeNode.update({
      where: { id },
      data: { mastery: clamp(node.mastery + delta, 0, 1) },
    });
  },

  async setMastery(id: string, mastery: number) {
    await prisma.knowledgeNode.update({
      where: { id },
      data: { mastery: clamp(mastery, 0, 1) },
    });
  },
};
