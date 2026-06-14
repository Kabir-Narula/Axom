import { route, parseBody, ok, ApiError } from "@/lib/api";
import { z } from "zod";
import { planRepo } from "@/lib/repositories/plans";

const schema = z.object({ status: z.enum(["pending", "done", "skipped"]) });

export const PATCH = route(
  async ({ user, req }) => {
    const id = req.nextUrl.pathname.split("/").filter(Boolean).pop()!;
    const { status } = await parseBody(req, schema);
    const updated = await planRepo.setTaskStatus(id, user.id, status);
    if (!updated) throw new ApiError(404, "Task not found.");
    return ok({ status });
  },
  { rateLimit: { limit: 120, windowMs: 60_000 } }
);
