import { Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/misc";
import { ResearchLink } from "./research-link";
import { pct } from "@/lib/utils";
import type { ConceptView } from "./types";

export function KnowledgePanel({
  courseId,
  concepts,
}: {
  courseId: string;
  concepts: ConceptView[];
}) {
  if (concepts.length === 0) {
    return (
      <EmptyState
        icon={<Network className="size-5" strokeWidth={1.5} />}
        title="No knowledge graph yet"
        description="Upload material to extract concepts and the relationships between them."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {concepts.length} concepts extracted, ordered by exam-likelihood.
      </p>
      {concepts.map((c) => (
        <div
          key={c.id}
          className="rounded-lg border border-border bg-card p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                {c.label}
              </h3>
              {c.sourceRef && (
                <p className="text-xs text-muted-foreground">{c.sourceRef}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="text-xs tabular-nums text-muted-foreground">
                {pct(c.importance)} likely
              </span>
              <ResearchLink courseId={courseId} query={c.label} compact />
            </div>
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {c.summary}
          </p>
          {c.keyTerms.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.keyTerms.slice(0, 6).map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
          )}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Mastery</span>
              <span className="tabular-nums">{pct(c.mastery)}</span>
            </div>
            <Progress value={c.mastery} />
          </div>
        </div>
      ))}
    </div>
  );
}
