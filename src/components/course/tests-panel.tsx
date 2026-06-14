"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Target, Timer, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, ApiClientError } from "@/lib/client";
import {
  DIFFICULTIES,
  QUESTION_TYPES,
  type Difficulty,
  type QuestionType,
} from "@/lib/validation";
import { cn, formatShortDate } from "@/lib/utils";
import type { QuizListItem } from "./types";

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  exam: "Exam-hard",
  trick: "Trick",
};

const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: "Multiple choice",
  short: "Short answer",
  long: "Long answer",
  cloze: "Fill in blank",
  truefalse: "True / False",
  code: "Code",
  case: "Case-based",
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-[#3f3f46] bg-secondary text-foreground"
          : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function TestsPanel({
  courseId,
  quizzes,
  hasConcepts,
}: {
  courseId: string;
  quizzes: QuizListItem[];
  hasConcepts: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [mode, setMode] = useState<"practice" | "timed">("practice");
  const [count, setCount] = useState(8);
  const [types, setTypes] = useState<QuestionType[]>(["mcq", "short"]);
  const [busy, setBusy] = useState(false);

  function toggleType(t: QuestionType) {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  async function generate() {
    if (types.length === 0) {
      toast("Pick at least one question type.", "error");
      return;
    }
    setBusy(true);
    try {
      const quiz = await api<{ id: string }>("/api/quizzes", {
        method: "POST",
        body: { courseId, difficulty, mode, questionCount: count, types },
      });
      toast("Test ready.", "success");
      router.push(`/study/quiz/${quiz.id}`);
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : "Failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Build a practice test
        </h3>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Difficulty
          </p>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d}
                active={difficulty === d}
                onClick={() => setDifficulty(d)}
              >
                {DIFF_LABEL[d]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Question types
          </p>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map((t) => (
              <Chip
                key={t}
                active={types.includes(t)}
                onClick={() => toggleType(t)}
              >
                {TYPE_LABEL[t]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-8">
          <div className="min-w-[200px]">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Questions: <span className="text-foreground tabular-nums">{count}</span>
            </p>
            <Slider
              min={3}
              max={20}
              step={1}
              value={[count]}
              onValueChange={(v) => setCount(v[0])}
              className="w-48"
            />
          </div>
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Mode
            </p>
            <div className="flex gap-2">
              <Chip active={mode === "practice"} onClick={() => setMode("practice")}>
                Practice
              </Chip>
              <Chip active={mode === "timed"} onClick={() => setMode("timed")}>
                <Timer className="size-3" /> Timed sim
              </Chip>
            </div>
          </div>
        </div>

        <div>
          <Button onClick={generate} loading={busy} disabled={!hasConcepts}>
            Generate test <ArrowRight />
          </Button>
          {!hasConcepts && (
            <p className="mt-2 text-xs text-muted-foreground">
              Upload course material first to generate questions.
            </p>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Past tests ({quizzes.length})
        </h3>
        {quizzes.length === 0 ? (
          <EmptyState
            icon={<Target className="size-5" strokeWidth={1.5} />}
            title="No tests yet"
            description="Generate a practice test to start diagnosing your gaps."
          />
        ) : (
          <div className="space-y-2">
            {quizzes.map((q) => (
              <Link key={q.id} href={`/study/quiz/${q.id}`}>
                <div className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-[#3f3f46]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {q.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {q.questionCount} questions · {formatShortDate(q.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {q.completedAt && q.scorePct !== null ? (
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {Math.round(q.scorePct)}%
                      </span>
                    ) : (
                      <Badge variant="outline">In progress</Badge>
                    )}
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
