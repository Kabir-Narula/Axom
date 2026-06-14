import { route, parseBody, ok } from "@/lib/api";
import { submitAnswerSchema } from "@/lib/validation";
import { submitAnswer } from "@/lib/services/exam-service";

export const POST = route(
  async ({ user, req }) => {
    const input = await parseBody(req, submitAnswerSchema);
    const result = await submitAnswer({
      userId: user.id,
      questionId: input.questionId,
      response: input.response,
      confidence: input.confidence,
      timeMs: input.timeMs,
    });
    return ok(result);
  },
  { rateLimit: { limit: 120, windowMs: 60_000 } }
);
