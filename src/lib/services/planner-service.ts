import { courseRepo } from "@/lib/repositories/courses";
import { knowledgeRepo } from "@/lib/repositories/knowledge";
import { planRepo } from "@/lib/repositories/plans";
import { KnowledgeGraph } from "@/lib/dsa/graph";
import { ApiError } from "@/lib/api";

const DAY_MS = 86_400_000;

interface PlanTask {
  date: Date;
  kind: string;
  title: string;
  nodeIds: string[];
  durationMin: number;
  order: number;
}

/**
 * Build a day-by-day study plan from now to the exam date, ordered by the
 * knowledge graph (prerequisites first) and spaced for retention.
 *
 * - Learn phase spreads new concepts across the early days.
 * - Each concept is revisited at +1, +3, +7 days (expanding spaced repetition).
 * - Practice quizzes interleave every few days.
 * - The final days are full timed exam simulations.
 */
export async function buildStudyPlan(input: {
  userId: string;
  courseId: string;
  examDate: Date;
  dailyMinutes: number;
}) {
  const course = await courseRepo.findForUser(input.courseId, input.userId);
  if (!course) throw new ApiError(404, "Course not found.");

  const start = startOfDay(new Date());
  const exam = startOfDay(input.examDate);
  const days = Math.round((exam.getTime() - start.getTime()) / DAY_MS);
  if (days < 1) {
    throw new ApiError(400, "Pick an exam date at least one day in the future.");
  }

  const { nodes, edges } = await knowledgeRepo.graphForCourse(input.courseId);
  if (nodes.length === 0) {
    throw new ApiError(
      400,
      "Add course material first so we can plan around its concepts."
    );
  }

  // Order concepts: prerequisites first, then by importance.
  const graph = new KnowledgeGraph();
  nodes.forEach((n) => graph.addNode(n.id));
  edges.forEach((e) =>
    graph.addEdge({
      from: e.fromId,
      to: e.toId,
      relation: e.relation as "prerequisite" | "related",
      weight: e.weight,
    })
  );
  const topo = graph.topologicalOrder();
  const labelById = new Map(nodes.map((n) => [n.id, n.label]));
  const importanceById = new Map(nodes.map((n) => [n.id, n.importance]));
  const order = topo
    .filter((id) => labelById.has(id))
    .sort((a, b) => {
      // Stable: keep topo order but lightly prefer high-importance early.
      return (importanceById.get(b) ?? 0) - (importanceById.get(a) ?? 0);
    });

  const buckets = new Map<number, PlanTask[]>();
  const add = (dayIdx: number, task: Omit<PlanTask, "date" | "order">) => {
    if (dayIdx < 0 || dayIdx >= days) return;
    const list = buckets.get(dayIdx) ?? [];
    list.push({
      ...task,
      date: new Date(start.getTime() + dayIdx * DAY_MS),
      order: 0,
    });
    buckets.set(dayIdx, list);
  };

  // Learning phase across the first ~70% of available days.
  const learningDays = Math.max(1, Math.floor(days * 0.7));
  const perDay = Math.max(1, Math.ceil(order.length / learningDays));
  const learnDayOf = new Map<string, number>();

  order.forEach((id, i) => {
    const learnDay = Math.min(learningDays - 1, Math.floor(i / perDay));
    learnDayOf.set(id, learnDay);
    add(learnDay, {
      kind: "learn",
      title: `Learn: ${labelById.get(id)}`,
      nodeIds: [id],
      durationMin: estimateLearnMinutes(importanceById.get(id) ?? 0.5),
    });
    for (const gap of [1, 3, 7]) {
      add(learnDay + gap, {
        kind: "review",
        title: `Review: ${labelById.get(id)}`,
        nodeIds: [id],
        durationMin: 6,
      });
    }
  });

  // Interleaved practice every 3 days.
  for (let d = 2; d < days - 1; d += 3) {
    const learnedSoFar = order.filter((id) => (learnDayOf.get(id) ?? 0) <= d);
    if (learnedSoFar.length === 0) continue;
    add(d, {
      kind: "practice",
      title: "Practice quiz on recent concepts",
      nodeIds: learnedSoFar.slice(-8),
      durationMin: 20,
    });
  }

  // Exam simulations in the final stretch.
  add(days - 1, {
    kind: "exam-sim",
    title: "Full timed exam simulation",
    nodeIds: order,
    durationMin: 45,
  });
  if (days >= 4) {
    add(days - 2, {
      kind: "exam-sim",
      title: "Timed mixed review",
      nodeIds: order,
      durationMin: 30,
    });
  }

  // Flatten with within-day ordering by kind priority.
  const kindRank: Record<string, number> = {
    learn: 0,
    review: 1,
    practice: 2,
    "exam-sim": 3,
  };
  const tasks: PlanTask[] = [];
  for (const [, list] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    list.sort((a, b) => (kindRank[a.kind] ?? 9) - (kindRank[b.kind] ?? 9));
    list.forEach((t, i) => tasks.push({ ...t, order: i }));
  }

  const plan = await planRepo.create({
    courseId: input.courseId,
    examDate: exam,
    dailyMinutes: input.dailyMinutes,
    tasks,
  });
  return plan;
}

function estimateLearnMinutes(importance: number): number {
  return Math.round(10 + importance * 12);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
