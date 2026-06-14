"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Eye, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Kbd } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { ResearchLink } from "@/components/course/research-link";
import { api, ApiClientError } from "@/lib/client";

interface ReviewCard {
  id: string;
  front: string;
  back: string;
  kind: string;
  courseId: string;
  courseTitle: string;
  courseColor: string;
  conceptLabel: string | null;
}

const GRADES = [
  { grade: 1, label: "Again", hint: "Forgot", variant: "danger" as const },
  { grade: 3, label: "Hard", hint: "Struggled", variant: "secondary" as const },
  { grade: 4, label: "Good", hint: "Recalled", variant: "secondary" as const },
  { grade: 5, label: "Easy", hint: "Instant", variant: "default" as const },
];

export function ReviewSession({ cards }: { cards: ReviewCard[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const current = cards[index];

  // Keyboard: Space/Enter reveals; 1–4 grade once revealed.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      if (!revealed) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          setRevealed(true);
        }
        return;
      }
      const n = Number.parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= GRADES.length) {
        e.preventDefault();
        grade(GRADES[n - 1].grade);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, done, index, busy]);

  async function grade(g: number) {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/api/review`, {
        method: "POST",
        body: { cardId: current.id, grade: g },
      });
      setReviewed((r) => r + 1);
      if (index === cards.length - 1) {
        setDone(true);
        router.refresh();
      } else {
        setIndex((i) => i + 1);
        setRevealed(false);
      }
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : "Failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-md py-16 text-center"
      >
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-md border border-border bg-muted text-foreground">
          <Check className="size-5" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Session complete
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          You reviewed {reviewed} card{reviewed === 1 ? "" : "s"}. Each one is now
          scheduled for the right moment to come back.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => router.push("/dashboard")}>
            Dashboard
          </Button>
          <Button onClick={() => router.refresh()}>
            <RotateCcw /> Check for more
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Card {index + 1} of {cards.length}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: current.courseColor }}
          />
          {current.courseTitle}
        </span>
      </div>
      <Progress value={index / cards.length} className="mb-8" />

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="min-h-[260px] rounded-lg border border-border bg-card p-8"
        >
          {current.conceptLabel && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Badge variant="outline">{current.conceptLabel}</Badge>
              <ResearchLink
                courseId={current.courseId}
                query={current.conceptLabel}
                compact
              />
            </div>
          )}
          <p className="text-lg font-medium leading-relaxed text-foreground">
            {current.front}
          </p>

          {revealed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 border-t border-border pt-6"
            >
              <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                Answer
              </p>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {current.back}
              </p>
            </motion.div>
          ) : (
            <div className="mt-8 flex items-center gap-3">
              <Button variant="secondary" onClick={() => setRevealed(true)}>
                <Eye /> Show answer
              </Button>
              <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                or press <Kbd>Space</Kbd>
              </span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <p className="mb-2 text-center text-xs text-muted-foreground">
            How well did you recall it?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map((g, i) => (
              <Button
                key={g.grade}
                variant={g.variant}
                onClick={() => grade(g.grade)}
                disabled={busy}
                className="flex h-auto flex-col py-2.5"
              >
                <span className="flex items-center gap-1.5">
                  {g.label}
                  <span className="hidden opacity-60 sm:inline">
                    <Kbd>{i + 1}</Kbd>
                  </span>
                </span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  {g.hint}
                </span>
              </Button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
