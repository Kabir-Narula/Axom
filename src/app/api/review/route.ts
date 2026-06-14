import { route, parseBody, ok } from "@/lib/api";
import { reviewCardSchema } from "@/lib/validation";
import { gradeCard } from "@/lib/services/review-service";

export const POST = route(
  async ({ user, req }) => {
    const input = await parseBody(req, reviewCardSchema);
    const result = await gradeCard({
      userId: user.id,
      cardId: input.cardId,
      grade: input.grade,
    });
    return ok(result);
  },
  { rateLimit: { limit: 240, windowMs: 60_000 } }
);
