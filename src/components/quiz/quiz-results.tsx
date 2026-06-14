"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Gauge, Clock, Target, TrendingUp, AlertTriangle } from "lucide-react";
import { Ring } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { pct } from "@/lib/utils";
import type { QuizAnalytics } from "@/lib/services/exam-service";

const TYPE_LABEL: Record<string, string> = {
  mcq: "Multiple choice",
  short: "Short answer",
  long: "Long answer",
  cloze: "Fill in blank",
  truefalse: "True / False",
  code: "Code",
  case: "Case-based",
};

export function QuizResults({
  analytics,
  title,
  courseHref,
}: {
  analytics: QuizAnalytics;
  title: string;
  courseHref?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl space-y-8"
    >
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{title}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Your results
        </h1>
      </div>

      <div className="flex flex-col items-center gap-6 rounded-lg border border-border bg-card p-8 sm:flex-row sm:justify-around">
        <Ring value={analytics.scorePct / 100} size={116} stroke={8} accent />
        <div className="grid grid-cols-2 gap-6 text-center sm:text-left">
          <Metric
            icon={<Target className="size-4" strokeWidth={1.75} />}
            label="Answered"
            value={`${analytics.answered}/${analytics.totalQuestions}`}
          />
          <Metric
            icon={<Clock className="size-4" strokeWidth={1.75} />}
            label="Avg / question"
            value={`${analytics.avgTimeSec.toFixed(0)}s`}
          />
          <Metric
            icon={<Gauge className="size-4" strokeWidth={1.75} />}
            label="Score"
            value={`${Math.round(analytics.scorePct)}%`}
          />
          <Metric
            icon={<TrendingUp className="size-4" strokeWidth={1.75} />}
            label="Next level"
            value={analytics.recommendation.difficulty}
          />
        </div>
      </div>

      {analytics.overconfident && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-5">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              The illusion of knowing
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You rated yourself confident on questions you missed. That gap is
              exactly where exams catch people — we&apos;ll target it next.
            </p>
          </div>
        </div>
      )}

      {analytics.calibration.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Confidence calibration
          </h3>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">
            How your accuracy matched your confidence.
          </p>
          <div className="space-y-3.5">
            {analytics.calibration.map((c) => (
              <div key={c.confidence}>
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Confidence {c.confidence}/5</span>
                  <span className="tabular-nums">{pct(c.accuracy)} correct</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/80"
                    style={{ width: `${c.accuracy * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.topicHeatmap.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
            Performance by question type
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {analytics.topicHeatmap.map((t) => (
              <div
                key={t.label}
                className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-2.5"
              >
                <span className="text-sm text-foreground">
                  {TYPE_LABEL[t.label] ?? t.label}
                </span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {pct(t.accuracy)} · {t.count}q
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border border-l-2 border-l-brand bg-card p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <TrendingUp className="size-4 text-brand" strokeWidth={1.75} />
          What Axom recommends next
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {analytics.recommendation.rationale}
        </p>
      </div>

      <div className="flex justify-center gap-3">
        <Link href={courseHref ?? "/dashboard"}>
          <Button variant="secondary">Back to course</Button>
        </Link>
        <Link href="/review">
          <Button>Review weak cards</Button>
        </Link>
      </div>
    </motion.div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-1 text-lg font-semibold capitalize tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
