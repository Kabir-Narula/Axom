import { Target, TrendingUp, AlertCircle } from "lucide-react";
import { Progress, Ring } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/misc";
import { ResearchLink } from "./research-link";
import { relativeDays, pct } from "@/lib/utils";
import type { ConceptView } from "./types";

export function OverviewPanel({
  courseId,
  concepts,
  examDate,
}: {
  courseId: string;
  concepts: ConceptView[];
  examDate: string | null;
}) {
  if (concepts.length === 0) {
    return (
      <EmptyState
        icon={<Target className="size-5" strokeWidth={1.5} />}
        title="Nothing mapped yet"
        description="Head to Materials and upload your slides or notes. Axom will populate this overview with the concepts most likely to be tested."
      />
    );
  }

  const avgMastery =
    concepts.reduce((s, c) => s + c.mastery, 0) / concepts.length;
  const likelyTested = [...concepts]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5);
  const weakest = [...concepts]
    .filter((c) => c.mastery < 0.5)
    .sort(
      (a, b) => b.importance * (1 - b.mastery) - a.importance * (1 - a.mastery)
    )
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-6">
          <Ring value={avgMastery} size={60} />
          <div>
            <p className="text-sm text-foreground">Overall mastery</p>
            <p className="text-xs text-muted-foreground">
              across {concepts.length} concepts
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Exam</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {examDate ? relativeDays(examDate) : "Not set"}
          </p>
          {examDate && (
            <p className="text-xs text-muted-foreground">
              {new Date(examDate).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Concepts to shore up</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {weakest.length}
          </p>
          <p className="text-xs text-muted-foreground">below 50% mastery</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <TrendingUp className="size-4 text-muted-foreground" strokeWidth={1.75} />
          Likely to be tested
        </h3>
        <p className="mb-5 mt-1 text-sm text-muted-foreground">
          Ranked by emphasis in your materials — focus here first.
        </p>
        <div className="space-y-4">
          {likelyTested.map((c) => (
            <div key={c.id}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="truncate text-sm text-foreground">
                  {c.label}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {pct(c.importance)} likely · {pct(c.mastery)} mastered
                </span>
              </div>
              <Progress value={c.mastery} />
            </div>
          ))}
        </div>
      </div>

      {weakest.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            <AlertCircle className="size-4 text-muted-foreground" strokeWidth={1.75} />
            Weak spots to fix
          </h3>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            High-importance concepts where your mastery is still low.
          </p>
          <div className="space-y-2.5">
            {weakest.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate text-foreground">{c.label}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <ResearchLink courseId={courseId} query={c.label} compact />
                  <span className="tabular-nums text-muted-foreground">
                    {pct(c.mastery)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
