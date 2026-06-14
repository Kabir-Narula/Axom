"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Timer,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Spinner, Kbd } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, ApiClientError } from "@/lib/client";
import { cn } from "@/lib/utils";
import { QuizResults } from "./quiz-results";
import { ResearchLink } from "@/components/course/research-link";
import type { QuizAnalytics } from "@/lib/services/exam-service";

interface RunnerQuestion {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  difficulty: string;
  topicLabel: string | null;
}

interface SubmitResponse {
  correct: boolean;
  score: number;
  correctAnswer: string;
  explanation: string;
  microLesson: {
    diagnosis: string;
    explanation: string;
    tip: string;
  } | null;
}

const CONFIDENCE_LABELS = ["Guessing", "Unsure", "Maybe", "Confident", "Certain"];

export function QuizRunner({
  quizId,
  courseId,
  title,
  mode,
  timeLimitSec,
  questions,
}: {
  quizId: string;
  courseId: string;
  title: string;
  mode: string;
  timeLimitSec: number | null;
  questions: RunnerQuestion[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);
  const [timeLeft, setTimeLeft] = useState(timeLimitSec ?? 0);
  const questionStart = useRef(0);

  const current = questions[index];
  const isLast = index === questions.length - 1;

  const finish = useCallback(async () => {
    setFinishing(true);
    try {
      const res = await api<{ scorePct: number; analytics: QuizAnalytics }>(
        `/api/quizzes/${quizId}/complete`,
        { method: "POST" }
      );
      setAnalytics(res.analytics);
      router.refresh();
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : "Failed.", "error");
      setFinishing(false);
    }
  }, [quizId, router, toast]);

  useEffect(() => {
    if (mode !== "timed" || analytics) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          queueMicrotask(finish);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [mode, analytics, finish]);

  useEffect(() => {
    questionStart.current = Date.now();
  }, [index]);

  // Keyboard shortcuts: number keys pick an option, Enter submits / advances.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (result) {
        if (e.key === "Enter") {
          e.preventDefault();
          next();
        }
        return;
      }
      if (current.options.length > 0) {
        const n = Number.parseInt(e.key, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= current.options.length) {
          e.preventDefault();
          setResponse(current.options[n - 1]);
          return;
        }
        if (e.key === "Enter" && response) {
          e.preventDefault();
          submit();
        }
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        // Free-text: ⌘/Ctrl+Enter submits (plain Enter stays a newline).
        e.preventDefault();
        submit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, response, current]);

  async function submit() {
    if (!response.trim()) {
      toast("Give it a shot before revealing the answer.", "info");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<SubmitResponse>(`/api/quizzes/${quizId}/answer`, {
        method: "POST",
        body: {
          questionId: current.id,
          response,
          confidence,
          timeMs: Date.now() - questionStart.current,
        },
      });
      setResult(res);
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : "Failed.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    setResult(null);
    setResponse("");
    setConfidence(3);
    if (isLast) finish();
    else setIndex((i) => i + 1);
  }

  if (analytics) {
    return <QuizResults analytics={analytics} title={title} />;
  }

  if (finishing) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <Spinner />
        <p className="text-sm text-muted-foreground">
          Analysing your performance…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{title}</p>
          <p className="text-xs text-muted-foreground/70">
            Question {index + 1} of {questions.length}
          </p>
        </div>
        {mode === "timed" && (
          <Badge variant={timeLeft < 30 ? "destructive" : "outline"}>
            <Timer /> {formatTime(timeLeft)}
          </Badge>
        )}
      </div>

      <Progress
        value={(index + (result ? 1 : 0)) / questions.length}
        className="mb-8"
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="outline">{labelType(current.type)}</Badge>
            <Badge variant="outline">{current.difficulty}</Badge>
          </div>
          <h2 className="mb-6 text-lg font-medium leading-snug text-foreground">
            {current.prompt}
          </h2>

          {current.options.length > 0 ? (
            <div className="space-y-2">
              {current.options.map((opt, i) => {
                const selected = response === opt;
                const showState = result !== null;
                const isCorrect = showState && opt === result.correctAnswer;
                const isWrongPick = showState && selected && !result.correct;
                return (
                  <button
                    key={opt}
                    disabled={result !== null}
                    onClick={() => setResponse(opt)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors",
                      !showState &&
                        selected &&
                        "border-[#3f3f46] bg-secondary",
                      !showState &&
                        !selected &&
                        "border-border hover:border-[#3f3f46]",
                      isCorrect && "border-foreground/40 bg-secondary",
                      isWrongPick && "border-destructive/40 bg-destructive/5",
                      showState &&
                        !isCorrect &&
                        !isWrongPick &&
                        "border-border opacity-50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border",
                        selected ? "border-foreground" : "border-border"
                      )}
                    >
                      {selected && (
                        <span className="size-2 rounded-full bg-foreground" />
                      )}
                    </span>
                    <span className="flex-1 text-foreground">{opt}</span>
                    {!showState && i < 9 && (
                      <span className="shrink-0 opacity-60">
                        <Kbd>{i + 1}</Kbd>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              disabled={result !== null}
              rows={current.type === "long" || current.type === "code" ? 7 : 4}
              placeholder={
                current.type === "code"
                  ? "Write your code or pseudocode…"
                  : "Type your answer…"
              }
              className={current.type === "code" ? "font-mono" : ""}
            />
          )}

          {!result && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                How confident are you?
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((c) => (
                  <button
                    key={c}
                    onClick={() => setConfidence(c)}
                    className={cn(
                      "flex-1 rounded-md border py-2 text-xs transition-colors",
                      confidence === c
                        ? "border-[#3f3f46] bg-secondary text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {CONFIDENCE_LABELS[c - 1]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {result && (
            <Feedback
              result={result}
              courseId={courseId}
              topicLabel={current.topicLabel}
            />
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              {!result ? (
                current.options.length > 0 ? (
                  <>
                    <Kbd>1</Kbd>–<Kbd>{Math.min(current.options.length, 9)}</Kbd>
                    to choose · <Kbd>↵</Kbd> to submit
                  </>
                ) : (
                  <>
                    <Kbd>⌘</Kbd>
                    <Kbd>↵</Kbd> to submit
                  </>
                )
              ) : (
                <>
                  <Kbd>↵</Kbd> for next
                </>
              )}
            </p>
            {!result ? (
              <Button onClick={submit} loading={submitting}>
                Submit answer
              </Button>
            ) : (
              <Button onClick={next}>
                {isLast ? "Finish & see analysis" : "Next question"}
                <ArrowRight />
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Feedback({
  result,
  courseId,
  topicLabel,
}: {
  result: SubmitResponse;
  courseId: string;
  topicLabel: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 space-y-3"
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium",
          result.correct
            ? "border-border bg-secondary text-foreground"
            : "border-destructive/40 bg-destructive/5 text-destructive"
        )}
      >
        {result.correct ? (
          <CheckCircle2 className="size-4" />
        ) : (
          <XCircle className="size-4" />
        )}
        {result.correct
          ? `Correct${
              result.score < 1
                ? ` (${Math.round(result.score * 100)}% credit)`
                : ""
            }`
          : "Not quite"}
      </div>

      {!result.correct && (
        <div className="rounded-md border border-border bg-card px-4 py-3 text-sm">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Expected answer
          </p>
          <p className="mt-1 text-foreground">{result.correctAnswer}</p>
        </div>
      )}

      {result.explanation && (
        <div className="rounded-md border border-border bg-card px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {result.explanation}
        </div>
      )}

      {!result.correct && topicLabel && !result.microLesson && (
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <ResearchLink courseId={courseId} query={topicLabel} />
        </div>
      )}

      {result.microLesson && (
        <div className="space-y-2 rounded-md border border-border border-l-2 border-l-brand bg-card px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Lightbulb className="size-4 text-brand" /> Why this tripped you up
          </p>
          <p className="leading-relaxed text-muted-foreground">
            {result.microLesson.diagnosis}
          </p>
          <p className="leading-relaxed text-muted-foreground">
            {result.microLesson.explanation}
          </p>
          <p className="leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Next time: </span>
            {result.microLesson.tip}
          </p>
          {!result.correct && topicLabel && (
            <div className="border-t border-border pt-3">
              <ResearchLink courseId={courseId} query={topicLabel} />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function labelType(type: string): string {
  const map: Record<string, string> = {
    mcq: "Multiple choice",
    short: "Short answer",
    long: "Long answer",
    cloze: "Fill in the blank",
    truefalse: "True / False",
    code: "Code",
    case: "Case-based",
  };
  return map[type] ?? type;
}

function formatTime(s: number): string {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.max(0, s) % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
