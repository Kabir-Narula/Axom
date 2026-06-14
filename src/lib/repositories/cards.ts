import { prisma } from "@/lib/db";
import type { Sm2Result } from "@/lib/learning/sm2";

export const cardRepo = {
  async createMany(
    courseId: string,
    cards: {
      front: string;
      back: string;
      kind: string;
      nodeId?: string | null;
    }[]
  ) {
    let count = 0;
    for (const c of cards) {
      await prisma.card.create({
        data: {
          courseId,
          nodeId: c.nodeId ?? null,
          front: c.front,
          back: c.back,
          kind: c.kind,
        },
      });
      count += 1;
    }
    return count;
  },

  listByCourse(courseId: string) {
    return prisma.card.findMany({
      where: { courseId },
      orderBy: { dueAt: "asc" },
      include: { node: { select: { label: true, importance: true } } },
    });
  },

  /** Cards across all of a user's courses that are due now (for global review). */
  listDueForUser(userId: string, now = new Date()) {
    return prisma.card.findMany({
      where: { course: { userId }, dueAt: { lte: now } },
      include: {
        node: { select: { id: true, label: true, importance: true } },
        course: { select: { id: true, title: true, color: true } },
      },
    });
  },

  listForUserCourse(courseId: string, userId: string) {
    return prisma.card.findMany({
      where: { courseId, course: { userId } },
      include: { node: { select: { id: true, label: true, importance: true } } },
    });
  },

  findForUser(id: string, userId: string) {
    return prisma.card.findFirst({
      where: { id, course: { userId } },
      include: { node: true },
    });
  },

  applySchedule(id: string, result: Sm2Result, now = new Date()) {
    return prisma.card.update({
      where: { id },
      data: {
        easiness: result.easiness,
        repetitions: result.repetitions,
        intervalDays: result.intervalDays,
        lapses: result.lapses,
        dueAt: result.dueAt,
        lastReviewedAt: now,
      },
    });
  },

  countDueForUser(userId: string, now = new Date()) {
    return prisma.card.count({
      where: { course: { userId }, dueAt: { lte: now } },
    });
  },
};
