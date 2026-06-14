import { prisma } from "@/lib/db";

function parseArr(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export interface QuestionView {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  answer: string;
  rubric: string[];
  explanation: string;
  difficulty: string;
  order: number;
  nodeId: string | null;
  topicLabel: string | null;
}

export const quizRepo = {
  async create(data: {
    courseId: string;
    userId: string;
    title: string;
    difficulty: string;
    mode: string;
    timeLimitSec: number | null;
    questions: {
      type: string;
      prompt: string;
      options: string[];
      answer: string;
      rubric: string[];
      explanation: string;
      difficulty: string;
      nodeId?: string | null;
    }[];
  }) {
    return prisma.quiz.create({
      data: {
        courseId: data.courseId,
        userId: data.userId,
        title: data.title,
        difficulty: data.difficulty,
        mode: data.mode,
        timeLimitSec: data.timeLimitSec,
        questions: {
          create: data.questions.map((q, i) => ({
            type: q.type,
            prompt: q.prompt,
            options: JSON.stringify(q.options),
            answer: q.answer,
            rubric: JSON.stringify(q.rubric),
            explanation: q.explanation,
            difficulty: q.difficulty,
            order: i,
            nodeId: q.nodeId ?? null,
          })),
        },
      },
      include: { questions: true },
    });
  },

  listByCourse(courseId: string) {
    return prisma.quiz.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        difficulty: true,
        mode: true,
        createdAt: true,
        completedAt: true,
        scorePct: true,
        _count: { select: { questions: true } },
      },
    });
  },

  async findForUser(id: string, userId: string) {
    const quiz = await prisma.quiz.findFirst({
      where: { id, userId },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { node: { select: { label: true } } },
        },
        answers: true,
        course: { select: { id: true, title: true } },
      },
    });
    if (!quiz) return null;
    return {
      ...quiz,
      questions: quiz.questions.map(
        (q): QuestionView => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          options: parseArr(q.options),
          answer: q.answer,
          rubric: parseArr(q.rubric),
          explanation: q.explanation,
          difficulty: q.difficulty,
          order: q.order,
          nodeId: q.nodeId,
          topicLabel: q.node?.label ?? null,
        })
      ),
    };
  },

  async questionForUser(questionId: string, userId: string) {
    const q = await prisma.question.findFirst({
      where: { id: questionId, quiz: { userId } },
      include: { node: true },
    });
    if (!q) return null;
    return {
      ...q,
      optionsArr: parseArr(q.options),
      rubricArr: parseArr(q.rubric),
    };
  },

  recordAnswer(data: {
    questionId: string;
    quizId: string;
    userId: string;
    response: string;
    correct: boolean;
    score: number;
    confidence: number;
    timeMs: number;
  }) {
    return prisma.answer.create({ data });
  },

  complete(id: string, scorePct: number) {
    return prisma.quiz.update({
      where: { id },
      data: { completedAt: new Date(), scorePct },
    });
  },

  start(id: string) {
    return prisma.quiz.update({
      where: { id },
      data: { startedAt: new Date() },
    });
  },
};
