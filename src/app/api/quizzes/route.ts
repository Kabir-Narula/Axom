import { route, parseBody, ok } from "@/lib/api";
import { generateQuizSchema } from "@/lib/validation";
import { generateQuiz } from "@/lib/services/exam-service";

export const POST = route(
  async ({ user, req }) => {
    const input = await parseBody(req, generateQuizSchema);
    const quiz = await generateQuiz({
      userId: user.id,
      courseId: input.courseId,
      difficulty: input.difficulty,
      mode: input.mode,
      questionCount: input.questionCount,
      types: input.types,
    });
    return ok(
      { id: quiz.id, questionCount: quiz.questions.length },
      { status: 201 }
    );
  },
  { rateLimit: { limit: 20, windowMs: 60_000 } }
);
