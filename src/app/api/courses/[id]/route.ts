import { route, parseBody, ok, fail, ApiError } from "@/lib/api";
import { courseSchema } from "@/lib/validation";
import { courseRepo } from "@/lib/repositories/courses";

export const PATCH = route(async ({ user, req }) => {
  const id = req.nextUrl.pathname.split("/").filter(Boolean).pop()!;
  const input = await parseBody(req, courseSchema.partial());
  const result = await courseRepo.update(id, user.id, {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.code !== undefined ? { code: input.code || null } : {}),
    ...(input.color !== undefined ? { color: input.color } : {}),
    ...(input.examDate !== undefined
      ? { examDate: input.examDate ? new Date(input.examDate) : null }
      : {}),
  });
  if (result.count === 0) throw new ApiError(404, "Course not found.");
  return ok({ updated: true });
});

export const DELETE = route(async ({ user, req }) => {
  const id = req.nextUrl.pathname.split("/").filter(Boolean).pop()!;
  const result = await courseRepo.delete(id, user.id);
  if (result.count === 0) return fail(404, "Course not found.");
  return ok({ deleted: true });
});
