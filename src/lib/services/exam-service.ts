import { courseRepo } from "@/lib/repositories/courses";
import { knowledgeRepo } from "@/lib/repositories/knowledge";
import { quizRepo } from "@/lib/repositories/quizzes";
import { getAIProvider } from "@/lib/ai";
import { buildConceptContexts } from "./context";
import { gradeAnswer } from "./grading";
import { recommendDifficulty } from "./adaptive";
import { ApiError } from "@/lib/api";
import type { Difficulty, QuestionType } from "@/lib/validation";
import type { MicroLesson } from "@/lib/ai/types";

const TIME_PER_Q: Record<Difficulty, number> = {
  easy: 45,
  medium: 60,
  hard: 90,
  exam: 100,
  trick: 120,
};

export async function generateQuiz(input: {
  userId: string;
  courseId: string;
  difficulty: Difficulty;
  mode: "practice" | "timed";
  questionCount: number;
  types: QuestionType[];
}) {
  const course = await courseRepo.findForUser(input.courseId, input.userId);
  if (!course) throw new ApiError(404, "Course not found.");

  // Weak-first ordering so the exam targets the student's actual gaps.
  const contexts = await buildConceptContexts(input.courseId, {
    weakFirst: true,
    limit: 30,
  });
  if (contexts.length === 0) {
    throw new ApiError(
      400,
      "No concepts yet — upload course material before generating a test."
    );
  }

  const ai = getAIProvider();
  const questions = await ai.generateQuestions(contexts, {
    count: input.questionCount,
    difficulty: input.difficulty,
    types: input.types,
  });
  if (questions.length === 0) {
    throw new ApiError(500, "Could not generate questions from this material.");
  }
  if (questions.length < Math.min(3, input.questionCount)) {
    throw new ApiError(
      400,
      `Only ${questions.length} question${questions.length === 1 ? "" : "s"} could be built from ${contexts.length} concept${contexts.length === 1 ? "" : "s"}. Re-upload your PDF (Materials tab) so Axom can re-extract concepts, or add more material.`
    );
  }

  const nodes = await knowledgeRepo.listByCourse(input.courseId);
  const nodeIdByLabel = new Map(nodes.map((n) => [n.label.toLowerCase(), n.id]));

  const timeLimitSec =
    input.mode === "timed"
      ? questions.length * TIME_PER_Q[input.difficulty]
      : null;

  const quiz = await quizRepo.create({
    courseId: input.courseId,
    userId: input.userId,
    title: `${course.title} — ${capitalize(input.difficulty)} ${
      input.mode === "timed" ? "Exam Sim" : "Practice"
    }`,
    difficulty: input.difficulty,
    mode: input.mode,
    timeLimitSec,
    questions: questions.map((q) => ({
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      answer: q.answer,
      rubric: q.rubric,
      explanation: q.explanation,
      difficulty: q.difficulty,
      nodeId: q.conceptLabel
        ? nodeIdByLabel.get(q.conceptLabel.toLowerCase()) ?? null
        : null,
    })),
  });

  return quiz;
}

export interface SubmitResult {
  correct: boolean;
  score: number;
  correctAnswer: string;
  explanation: string;
  microLesson: MicroLesson | null;
}

export async function submitAnswer(input: {
  userId: string;
  questionId: string;
  response: string;
  confidence: number;
  timeMs: number;
}): Promise<SubmitResult> {
  const question = await quizRepo.questionForUser(input.questionId, input.userId);
  if (!question) throw new ApiError(404, "Question not found.");

  const { correct, score } = gradeAnswer(
    question.type,
    input.response,
    question.answer,
    question.rubricArr
  );

  await quizRepo.recordAnswer({
    questionId: question.id,
    quizId: question.quizId,
    userId: input.userId,
    response: input.response,
    correct,
    score,
    confidence: input.confidence,
    timeMs: input.timeMs,
  });

  // Update mastery on the linked concept (Observer-style side effect).
  if (question.nodeId) {
    await knowledgeRepo.adjustMastery(
      question.nodeId,
      correct ? 0.08 * Math.max(score, 0.5) : -0.06
    );
  }

  // Wrong answers trigger a targeted micro-lesson (the core differentiator).
  let microLesson: MicroLesson | null = null;
  if (!correct) {
    const ai = getAIProvider();
    microLesson = await ai.explainMistake({
      prompt: question.prompt,
      correctAnswer: question.answer,
      studentAnswer: input.response,
      conceptSummary: question.node?.summary ?? question.explanation,
    });
  }

  return {
    correct,
    score,
    correctAnswer: question.answer,
    explanation: question.explanation,
    microLesson,
  };
}

export async function completeQuiz(input: { userId: string; quizId: string }) {
  const quiz = await quizRepo.findForUser(input.quizId, input.userId);
  if (!quiz) throw new ApiError(404, "Quiz not found.");

  const total = quiz.questions.length;
  const answered = quiz.answers;
  const scoreSum = answered.reduce((s, a) => s + a.score, 0);
  const scorePct = total > 0 ? (scoreSum / total) * 100 : 0;

  await quizRepo.complete(input.quizId, scorePct);

  const analytics = buildAnalytics(quiz, scorePct);
  return { scorePct, analytics };
}

export interface QuizAnalytics {
  scorePct: number;
  totalQuestions: number;
  answered: number;
  avgTimeSec: number;
  calibration: { confidence: number; accuracy: number }[];
  overconfident: boolean;
  topicHeatmap: { label: string; accuracy: number; count: number }[];
  recommendation: { difficulty: Difficulty; rationale: string };
}

type FullQuiz = NonNullable<Awaited<ReturnType<typeof quizRepo.findForUser>>>;

export function buildAnalytics(quiz: FullQuiz, scorePct: number): QuizAnalytics {
  const answers = quiz.answers;
  const total = quiz.questions.length;
  const answered = answers.length;

  const avgTimeSec =
    answered > 0
      ? answers.reduce((s, a) => s + a.timeMs, 0) / answered / 1000
      : 0;

  // Confidence calibration: accuracy at each self-rated confidence level.
  const calibration: { confidence: number; accuracy: number }[] = [];
  for (let c = 1; c <= 5; c++) {
    const group = answers.filter((a) => a.confidence === c);
    if (group.length === 0) continue;
    const acc = group.filter((a) => a.correct).length / group.length;
    calibration.push({ confidence: c, accuracy: acc });
  }

  const accuracy = answered > 0 ? answers.filter((a) => a.correct).length / answered : 0;
  const avgConfidence =
    answered > 0 ? answers.reduce((s, a) => s + a.confidence, 0) / answered : 3;

  // Topic weakness heatmap keyed by question's concept.
  const nodeLabelById = new Map<string, string>();
  for (const q of quiz.questions) {
    if (q.nodeId) nodeLabelById.set(q.id, q.nodeId);
  }
  const byTopic = new Map<string, { correct: number; count: number }>();
  for (const a of answers) {
    const q = quiz.questions.find((x) => x.id === a.questionId);
    const key = q?.type ?? "general";
    const cur = byTopic.get(key) ?? { correct: 0, count: 0 };
    cur.count += 1;
    if (a.correct) cur.correct += 1;
    byTopic.set(key, cur);
  }
  const topicHeatmap = [...byTopic.entries()].map(([label, v]) => ({
    label,
    accuracy: v.count > 0 ? v.correct / v.count : 0,
    count: v.count,
  }));

  const decision = recommendDifficulty(quiz.difficulty as Difficulty, {
    accuracy,
    avgConfidence,
    sampleSize: answered,
  });

  return {
    scorePct,
    totalQuestions: total,
    answered,
    avgTimeSec,
    calibration,
    overconfident: decision.overconfident,
    topicHeatmap,
    recommendation: {
      difficulty: decision.difficulty,
      rationale: decision.rationale,
    },
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
