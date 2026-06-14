import { PROVIDERS } from "@/lib/resources/providers";
import {
  RESOURCE_SOURCES,
  type ResourceResult,
  type ResourceSource,
} from "@/lib/resources/types";

export interface ResourceSearchResult {
  query: string;
  results: ResourceResult[];
  failedSources: ResourceSource[];
}

/**
 * Aggregate community + academic results for a topic.
 * Each source runs independently with a shared timeout — a slow or failing
 * source never blocks or breaks the others. Results are de-duplicated and
 * interleaved round-robin so no single source dominates the list.
 */
export async function searchResources(
  query: string,
  sources: ResourceSource[] = [...RESOURCE_SOURCES],
  { timeoutMs = 8000 }: { timeoutMs?: number } = {}
): Promise<ResourceSearchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const settled = await Promise.allSettled(
    sources.map((s) => PROVIDERS[s](query, controller.signal))
  );
  clearTimeout(timer);

  const buckets: ResourceResult[][] = [];
  const failedSources: ResourceSource[] = [];

  settled.forEach((outcome, i) => {
    if (outcome.status === "fulfilled" && outcome.value.length > 0) {
      buckets.push(outcome.value.sort((a, b) => b.score - a.score));
    } else if (outcome.status === "rejected") {
      failedSources.push(sources[i]);
    }
  });

  // Round-robin interleave for source diversity, then de-dupe by URL.
  const interleaved: ResourceResult[] = [];
  const seen = new Set<string>();
  const maxLen = Math.max(0, ...buckets.map((b) => b.length));
  for (let round = 0; round < maxLen; round++) {
    for (const bucket of buckets) {
      const item = bucket[round];
      if (!item) continue;
      const key = item.url.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      interleaved.push(item);
    }
  }

  return { query, results: interleaved, failedSources };
}
