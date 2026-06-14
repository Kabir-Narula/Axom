import { route, parseBody, ok } from "@/lib/api";
import { courseSchema } from "@/lib/validation";
import { courseRepo } from "@/lib/repositories/courses";

export const GET = route(async ({ user }) => {
  const courses = await courseRepo.listByUser(user.id);
  return ok(courses);
});

export const POST = route(
  async ({ user, req }) => {
    const input = await parseBody(req, courseSchema);
    const course = await courseRepo.create({
      userId: user.id,
      title: input.title,
      code: input.code || null,
      color: input.color,
      examDate: input.examDate ? new Date(input.examDate) : null,
    });
    return ok(course, { status: 201 });
  },
  { rateLimit: { limit: 30, windowMs: 60_000 } }
);
