"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  SkipForward,
  BookOpen,
  Layers,
  Target,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, ApiClientError } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { PlanView, PlanTaskView } from "./types";

const KIND_META: Record<string, { icon: typeof BookOpen; label: string }> = {
  learn: { icon: BookOpen, label: "Learn" },
  review: { icon: Layers, label: "Review" },
  practice: { icon: Target, label: "Practice" },
  "exam-sim": { icon: GraduationCap, label: "Exam sim" },
};

export function PlanPanel({
  courseId,
  plan,
  examDate,
  hasConcepts,
}: {
  courseId: string;
  plan: PlanView | null;
  examDate: string | null;
  hasConcepts: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const defaultDate = examDate
    ? new Date(examDate).toISOString().slice(0, 10)
    : "";

  async function generate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const date = String(form.get("examDate") ?? "");
    const minutes = Number(form.get("dailyMinutes") ?? 60);
    if (!date) {
      toast("Pick your exam date.", "error");
      return;
    }
    setBusy(true);
    try {
      await api("/api/plans", {
        method: "POST",
        body: {
          courseId,
          examDate: new Date(date + "T09:00:00").toISOString(),
          dailyMinutes: minutes,
        },
      });
      toast("Study plan built.", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : "Failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={generate}
        className="rounded-lg border border-border bg-card p-6"
      >
        <h3 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
          Build a study plan
        </h3>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="examDate">Exam date</Label>
            <Input
              id="examDate"
              name="examDate"
              type="date"
              defaultValue={defaultDate}
              className="w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dailyMinutes">Minutes / day</Label>
            <Input
              id="dailyMinutes"
              name="dailyMinutes"
              type="number"
              min={15}
              max={480}
              step={15}
              defaultValue={plan?.dailyMinutes ?? 60}
              className="w-32"
            />
          </div>
          <Button type="submit" loading={busy} disabled={!hasConcepts}>
            {plan ? "Rebuild plan" : "Build plan"}
          </Button>
        </div>
        {!hasConcepts && (
          <p className="mt-2 text-xs text-muted-foreground">
            Add course material first so the plan can be built around its
            concepts.
          </p>
        )}
      </form>

      {!plan ? (
        <EmptyState
          icon={<CalendarClock className="size-5" strokeWidth={1.5} />}
          title="No plan yet"
          description="Set your exam date above and Axom will schedule learning, spaced reviews, practice and exam simulations day by day."
        />
      ) : (
        <PlanTimeline plan={plan} />
      )}
    </div>
  );
}

function PlanTimeline({ plan }: { plan: PlanView }) {
  const groups = new Map<string, PlanTaskView[]>();
  for (const t of plan.tasks) {
    const day = new Date(t.date).toDateString();
    const list = groups.get(day) ?? [];
    list.push(t);
    groups.set(day, list);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([day, tasks]) => (
        <div key={day}>
          <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
            {new Date(day).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          <div className="space-y-2">
            {tasks.map((t) => (
              <PlanTaskRow key={t.id} task={t} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanTaskRow({ task }: { task: PlanTaskView }) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState(task.status);
  const [busy, setBusy] = useState(false);
  const meta = KIND_META[task.kind] ?? KIND_META.learn;
  const Icon = meta.icon;

  async function setTaskStatus(next: string) {
    setBusy(true);
    const prev = status;
    setStatus(next);
    try {
      await api(`/api/plans/tasks/${task.id}`, {
        method: "PATCH",
        body: { status: next },
      });
      router.refresh();
    } catch (err) {
      setStatus(prev);
      toast(err instanceof ApiClientError ? err.message : "Failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-opacity",
        status === "done" && "opacity-55",
        status === "skipped" && "opacity-40"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon
          className="size-4 shrink-0 text-muted-foreground"
          strokeWidth={1.75}
        />
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-sm font-medium text-foreground",
              status === "done" && "line-through"
            )}
          >
            {task.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {meta.label} · {task.durationMin} min
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() =>
                setTaskStatus(status === "done" ? "pending" : "done")
              }
              disabled={busy}
              className={cn(
                "flex size-7 items-center justify-center rounded-md border transition-colors",
                status === "done"
                  ? "border-[#3f3f46] bg-secondary text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
              aria-label="Mark done"
            >
              <Check className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {status === "done" ? "Mark as not done" : "Mark done"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() =>
                setTaskStatus(status === "skipped" ? "pending" : "skipped")
              }
              disabled={busy}
              className={cn(
                "flex size-7 items-center justify-center rounded-md border transition-colors",
                status === "skipped"
                  ? "border-destructive/40 text-destructive"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
              aria-label="Skip"
            >
              <SkipForward className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {status === "skipped" ? "Un-skip" : "Skip this task"}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
