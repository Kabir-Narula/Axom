import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { quizRepo } from "@/lib/repositories/quizzes";
import { buildAnalytics } from "@/lib/services/exam-service";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { QuizResults } from "@/components/quiz/quiz-results";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const quiz = await quizRepo.findForUser(id, user.id);
  if (!quiz) notFound();

  const courseHref = `/courses/${quiz.course.id}`;

  if (quiz.completedAt) {
    const analytics = buildAnalytics(quiz, quiz.scorePct ?? 0);
    return (
      <div>
        <Link
          href={courseHref}
          className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Back to course
        </Link>
        <QuizResults analytics={analytics} title={quiz.title} courseHref={courseHref} />
      </div>
    );
  }

  // Sanitize: never send answers/rubric/explanations to the client pre-grade.
  const runnerQuestions = quiz.questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: q.options,
    difficulty: q.difficulty,
    topicLabel: q.topicLabel,
  }));

  return (
    <div>
      <Link
        href={courseHref}
        className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Exit to course
      </Link>
      <QuizRunner
        quizId={quiz.id}
        courseId={quiz.course.id}
        title={quiz.title}
        mode={quiz.mode}
        timeLimitSec={quiz.timeLimitSec}
        questions={runnerQuestions}
      />
    </div>
  );
}
