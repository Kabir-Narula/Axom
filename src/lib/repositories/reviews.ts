import { prisma } from "@/lib/db";

export const reviewRepo = {
  create(data: {
    cardId: string;
    userId: string;
    grade: number;
    prevInterval: number;
    nextInterval: number;
  }) {
    return prisma.review.create({ data });
  },

  countByUserSince(userId: string, since: Date) {
    return prisma.review.count({
      where: { userId, reviewedAt: { gte: since } },
    });
  },

  recentByUser(userId: string, take = 30) {
    return prisma.review.findMany({
      where: { userId },
      orderBy: { reviewedAt: "desc" },
      take,
    });
  },
};
