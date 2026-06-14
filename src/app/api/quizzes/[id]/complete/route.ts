import { route, ok } from "@/lib/api";
import { completeQuiz } from "@/lib/services/exam-service";

export const POST = route(
  async ({ user, req }) => {
    const id = req.nextUrl.pathname.split("/").filter(Boolean).at(-2)!;
    const result = await completeQuiz({ userId: user.id, quizId: id });
    return ok(result);
  },
  { rateLimit: { limit: 30, windowMs: 60_000 } }
);
