export const RESOURCE_SOURCES = [
  "reddit",
  "stackoverflow",
  "hackernews",
  "wikipedia",
  "arxiv",
] as const;

export type ResourceSource = (typeof RESOURCE_SOURCES)[number];

export interface ResourceResult {
  id: string;
  source: ResourceSource;
  title: string;
  url: string;
  snippet: string;
  meta: string;
  score: number;
}

export const SOURCE_LABEL: Record<ResourceSource, string> = {
  reddit: "Reddit",
  stackoverflow: "Stack Overflow",
  hackernews: "Hacker News",
  wikipedia: "Wikipedia",
  arxiv: "arXiv",
};
