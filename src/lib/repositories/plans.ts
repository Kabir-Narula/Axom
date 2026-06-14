import { prisma } from "@/lib/db";

function parseIds(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export const planRepo = {
  async create(data: {
    courseId: string;
    examDate: Date;
    dailyMinutes: number;
    tasks: {
      date: Date;
      kind: string;
      title: string;
      nodeIds: string[];
      durationMin: number;
      order: number;
    }[];
  }) {
    // Replace any existing plan for the course (one active plan per course).
    await prisma.studyPlan.deleteMany({ where: { courseId: data.courseId } });
    return prisma.studyPlan.create({
      data: {
        courseId: data.courseId,
        examDate: data.examDate,
        dailyMinutes: data.dailyMinutes,
        tasks: {
          create: data.tasks.map((t) => ({
            date: t.date,
            kind: t.kind,
            title: t.title,
            nodeIds: JSON.stringify(t.nodeIds),
            durationMin: t.durationMin,
            order: t.order,
          })),
        },
      },
      include: { tasks: { orderBy: [{ date: "asc" }, { order: "asc" }] } },
    });
  },

  async findByCourse(courseId: string, userId: string) {
    const plan = await prisma.studyPlan.findFirst({
      where: { courseId, course: { userId } },
      include: { tasks: { orderBy: [{ date: "asc" }, { order: "asc" }] } },
    });
    if (!plan) return null;
    return {
      ...plan,
      tasks: plan.tasks.map((t) => ({ ...t, nodeIds: parseIds(t.nodeIds) })),
    };
  },

  async setTaskStatus(taskId: string, userId: string, status: string) {
    const task = await prisma.studyTask.findFirst({
      where: { id: taskId, plan: { course: { userId } } },
    });
    if (!task) return null;
    return prisma.studyTask.update({ where: { id: taskId }, data: { status } });
  },
};
