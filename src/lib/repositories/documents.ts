import { prisma } from "@/lib/db";

export const documentRepo = {
  create(data: {
    courseId: string;
    userId: string;
    title: string;
    kind: string;
    mimeType: string;
    sizeBytes: number;
    contentText: string;
    pageCount: number;
    status?: string;
  }) {
    return prisma.document.create({ data });
  },

  listByCourse(courseId: string, userId: string) {
    return prisma.document.findMany({
      where: { courseId, userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        kind: true,
        status: true,
        pageCount: true,
        sizeBytes: true,
        createdAt: true,
        _count: { select: { knowledgeNodes: true } },
      },
    });
  },

  findForUser(id: string, userId: string) {
    return prisma.document.findFirst({ where: { id, userId } });
  },

  setStatus(id: string, status: string) {
    return prisma.document.update({ where: { id }, data: { status } });
  },

  delete(id: string, userId: string) {
    return prisma.document.deleteMany({ where: { id, userId } });
  },
};
