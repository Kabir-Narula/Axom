import { prisma } from "@/lib/db";

export const noteRepo = {
  create(data: {
    courseId: string;
    documentId?: string | null;
    title: string;
    style: string;
    contentMd: string;
    meta?: Record<string, unknown>;
  }) {
    return prisma.note.create({
      data: {
        courseId: data.courseId,
        documentId: data.documentId ?? null,
        title: data.title,
        style: data.style,
        contentMd: data.contentMd,
        meta: JSON.stringify(data.meta ?? {}),
      },
    });
  },

  listByCourse(courseId: string) {
    return prisma.note.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        style: true,
        createdAt: true,
        documentId: true,
      },
    });
  },

  findForUser(id: string, userId: string) {
    return prisma.note.findFirst({ where: { id, course: { userId } } });
  },

  delete(id: string, userId: string) {
    return prisma.note.deleteMany({ where: { id, course: { userId } } });
  },
};
