import { prisma } from "@/lib/db";

export const courseRepo = {
  create(data: {
    userId: string;
    title: string;
    code?: string | null;
    color?: string;
    examDate?: Date | null;
  }) {
    return prisma.course.create({ data });
  },

  listByUser(userId: string) {
    return prisma.course.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            documents: true,
            knowledgeNodes: true,
            cards: true,
            notes: true,
            quizzes: true,
          },
        },
      },
    });
  },

  /** Ownership-scoped fetch — returns null if the course isn't the user's. */
  findForUser(id: string, userId: string) {
    return prisma.course.findFirst({ where: { id, userId } });
  },

  detailForUser(id: string, userId: string) {
    return prisma.course.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: {
            documents: true,
            knowledgeNodes: true,
            cards: true,
            notes: true,
            quizzes: true,
          },
        },
      },
    });
  },

  update(
    id: string,
    userId: string,
    data: Partial<{
      title: string;
      code: string | null;
      color: string;
      examDate: Date | null;
    }>
  ) {
    return prisma.course.updateMany({ where: { id, userId }, data });
  },

  delete(id: string, userId: string) {
    return prisma.course.deleteMany({ where: { id, userId } });
  },
};
