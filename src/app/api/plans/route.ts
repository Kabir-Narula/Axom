import { route, parseBody, ok } from "@/lib/api";
import { studyPlanSchema } from "@/lib/validation";
import { buildStudyPlan } from "@/lib/services/planner-service";

export const POST = route(
  async ({ user, req }) => {
    const input = await parseBody(req, studyPlanSchema);
    const plan = await buildStudyPlan({
      userId: user.id,
      courseId: input.courseId,
      examDate: new Date(input.examDate),
      dailyMinutes: input.dailyMinutes,
    });
    return ok({ id: plan.id, tasks: plan.tasks.length }, { status: 201 });
  },
  { rateLimit: { limit: 20, windowMs: 60_000 } }
);
