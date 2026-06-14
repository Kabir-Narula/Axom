import { courseRepo } from "@/lib/repositories/courses";
import { documentRepo } from "@/lib/repositories/documents";
import { knowledgeRepo } from "@/lib/repositories/knowledge";
import { cardRepo } from "@/lib/repositories/cards";
import { getAIProvider } from "@/lib/ai";
import type { ConceptContext } from "@/lib/ai/types";
import { ApiError } from "@/lib/api";

export interface IngestInput {
  userId: string;
  courseId: string;
  title: string;
  kind: string;
  mimeType: string;
  sizeBytes: number;
  contentText: string;
  pageCount: number;
}

export interface IngestResult {
  documentId: string;
  conceptCount: number;
  cardCount: number;
}

/**
 * Full ingestion pipeline: persist the document, extract a knowledge graph,
 * and generate spaced-repetition cards. Each stage has explicit success/failure
 * handling; a failure marks the document "failed" rather than silently dying.
 */
export async function ingestDocument(input: IngestInput): Promise<IngestResult> {
  const course = await courseRepo.findForUser(input.courseId, input.userId);
  if (!course) throw new ApiError(404, "Course not found.");

  const doc = await documentRepo.create({
    courseId: input.courseId,
    userId: input.userId,
    title: input.title,
    kind: input.kind,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    contentText: input.contentText,
    pageCount: input.pageCount,
    status: "processing",
  });

  try {
    const ai = getAIProvider();
    const { concepts, edges } = await ai.extractConcepts(input.contentText, {
      maxConcepts: 24,
    });

    if (concepts.length === 0) {
      await documentRepo.setStatus(doc.id, "ready");
      return { documentId: doc.id, conceptCount: 0, cardCount: 0 };
    }

    const createdNodes = await knowledgeRepo.createNodes(
      input.courseId,
      doc.id,
      concepts
    );

    // Map concept labels to created node ids to persist edges.
    const idByLabel = new Map<string, string>();
    createdNodes.forEach((n) => idByLabel.set(n.label.toLowerCase(), n.id));
    const edgeRecords: {
      fromId: string;
      toId: string;
      relation: string;
      weight: number;
    }[] = [];
    for (const e of edges) {
      const fromId = idByLabel.get(e.fromLabel.toLowerCase());
      const toId = idByLabel.get(e.toLabel.toLowerCase());
      if (!fromId || !toId) continue;
      edgeRecords.push({ fromId, toId, relation: e.relation, weight: e.weight });
    }
    await knowledgeRepo.createEdges(input.courseId, edgeRecords);

    // Generate study cards linked back to their source concept.
    const contexts: ConceptContext[] = createdNodes.map((n) => ({
      label: n.label,
      summary: n.summary,
      keyTerms: safeTerms(n.keyTerms),
      difficulty: n.difficulty,
      sourceText: n.summary,
    }));
    const cards = await ai.generateCards(contexts);
    const labelToId = idByLabel;
    const cardRecords = cards.map((c) => ({
      front: c.front,
      back: c.back,
      kind: c.kind,
      nodeId: c.conceptLabel
        ? labelToId.get(c.conceptLabel.toLowerCase()) ?? null
        : null,
    }));
    const cardCount = await cardRepo.createMany(input.courseId, cardRecords);

    await documentRepo.setStatus(doc.id, "ready");
    return {
      documentId: doc.id,
      conceptCount: createdNodes.length,
      cardCount,
    };
  } catch (err) {
    await documentRepo.setStatus(doc.id, "failed").catch(() => {});
    if (err instanceof ApiError) throw err;
    console.error("[ingest] failed", err);
    throw new ApiError(500, "Failed to process the document. Please retry.");
  }
}

function safeTerms(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
