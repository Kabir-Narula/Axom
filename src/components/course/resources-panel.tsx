"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  ExternalLink,
  MessagesSquare,
  Code2,
  Newspaper,
  BookText,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, ApiClientError } from "@/lib/client";
import { cn } from "@/lib/utils";
import {
  RESOURCE_SOURCES,
  SOURCE_LABEL,
  type ResourceResult,
  type ResourceSource,
} from "@/lib/resources/types";

const SOURCE_ICON: Record<ResourceSource, typeof Code2> = {
  reddit: MessagesSquare,
  stackoverflow: Code2,
  hackernews: Newspaper,
  wikipedia: BookText,
  arxiv: GraduationCap,
};

interface SearchResponse {
  query: string;
  results: ResourceResult[];
  failedSources: ResourceSource[];
}

export function ResourcesPanel({
  conceptLabels,
  initialQuery,
}: {
  conceptLabels: string[];
  initialQuery?: string;
}) {
  const { toast } = useToast();
  const [query, setQuery] = useState(initialQuery ?? "");
  const [active, setActive] = useState<Set<ResourceSource>>(
    new Set(RESOURCE_SOURCES)
  );
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [searchedFor, setSearchedFor] = useState("");
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current || !initialQuery?.trim()) return;
    bootstrapped.current = true;
    run(initialQuery, active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  async function run(q: string, sources: Set<ResourceSource>) {
    const term = q.trim();
    if (term.length < 2) {
      toast("Type at least 2 characters to search.", "info");
      return;
    }
    setLoading(true);
    setSearchedFor(term);
    try {
      const sourcesParam =
        sources.size === RESOURCE_SOURCES.length
          ? ""
          : `&sources=${[...sources].join(",")}`;
      const res = await api<SearchResponse>(
        `/api/resources?q=${encodeURIComponent(term)}${sourcesParam}`
      );
      setData(res);
      if (res.results.length === 0) {
        toast("No results found — try a broader term.", "info");
      }
    } catch (err) {
      toast(
        err instanceof ApiClientError ? err.message : "Search failed.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleSource(s: ResourceSource) {
    const nextSet = new Set(active);
    if (nextSet.has(s)) {
      if (nextSet.size === 1) return; // keep at least one
      nextSet.delete(s);
    } else {
      nextSet.add(s);
    }
    setActive(nextSet);
    if (searchedFor) run(searchedFor, nextSet);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Research a topic
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Pull the clearest community explanations and academic sources from
            across the web.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(query, active);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. how does a hash table handle collisions"
              className="pl-9"
            />
          </div>
          <Button type="submit" loading={loading}>
            Search
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {RESOURCE_SOURCES.map((s) => {
            const Icon = SOURCE_ICON[s];
            const on = active.has(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSource(s)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
                  on
                    ? "border-[#3f3f46] bg-secondary text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.75} />
                {SOURCE_LABEL[s]}
              </button>
            );
          })}
        </div>

        {conceptLabels.length > 0 && (
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
              From this course
            </p>
            <div className="flex flex-wrap gap-2">
              {conceptLabels.slice(0, 8).map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setQuery(label);
                    run(label, active);
                  }}
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-[#3f3f46] hover:text-foreground"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-4"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {data.results.length} result
              {data.results.length === 1 ? "" : "s"} for{" "}
              <span className="text-foreground">&ldquo;{searchedFor}&rdquo;</span>
            </p>
            {data.failedSources.length > 0 && (
              <p className="text-xs text-muted-foreground/70">
                {data.failedSources.map((s) => SOURCE_LABEL[s]).join(", ")}{" "}
                unavailable
              </p>
            )}
          </div>

          {data.results.length === 0 ? (
            <EmptyState
              icon={<Search className="size-5" strokeWidth={1.5} />}
              title="Nothing found"
              description="Try a broader phrasing, or enable more sources above."
            />
          ) : (
            <div className="space-y-2">
              {data.results.map((r) => (
                <ResourceCard key={r.id} result={r} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={<Search className="size-5" strokeWidth={1.5} />}
          title="Search for any topic"
          description="Reddit threads, Stack Overflow answers, Hacker News discussions, Wikipedia and arXiv — ranked and de-duplicated, in one place."
        />
      )}
    </div>
  );
}

function ResourceCard({ result }: { result: ResourceResult }) {
  const Icon = SOURCE_ICON[result.source];
  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border border-border bg-card p-4 transition-colors hover:border-[#3f3f46]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge variant="outline">
          <Icon className="size-3" strokeWidth={1.75} /> {SOURCE_LABEL[result.source]}
        </Badge>
        <ExternalLink className="size-3.5 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
      </div>
      <p className="text-sm font-medium leading-snug text-foreground">
        {result.title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{result.meta}</p>
      {result.snippet && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {result.snippet}
        </p>
      )}
    </a>
  );
}
