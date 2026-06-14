import "server-only";
import type { ResourceResult, ResourceSource } from "./types";

// A browser-like UA reduces spurious 403s from sources like Reddit. Note:
// some sources still block datacenter IPs regardless of headers — the service
// treats any failing source as "unavailable" and returns the rest.
const UA =
  "Mozilla/5.0 (compatible; Axom/1.0; +https://axom.app) student-learning-app";

const COMMON_HEADERS = {
  "User-Agent": UA,
  "Accept-Language": "en-US,en;q=0.9",
};

function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function clip(s: string, n = 220): string {
  const t = s.trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
}

async function getJson(
  url: string,
  signal: AbortSignal
): Promise<unknown> {
  const res = await fetch(url, {
    headers: { ...COMMON_HEADERS, Accept: "application/json" },
    signal,
    // Resources are public + cacheable; cache for an hour at the edge.
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

/** Community discussions on Reddit. */
export async function searchReddit(
  query: string,
  signal: AbortSignal
): Promise<ResourceResult[]> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(
    query
  )}&limit=8&sort=relevance&t=all`;
  const data = (await getJson(url, signal)) as {
    data?: { children?: { data?: Record<string, unknown> }[] };
  };
  const children = data?.data?.children ?? [];
  return children
    .map((c) => c.data ?? {})
    .filter((d) => d.title && d.permalink)
    .slice(0, 8)
    .map((d): ResourceResult => {
      const ups = Number(d.ups ?? 0);
      const comments = Number(d.num_comments ?? 0);
      return {
        id: `reddit:${d.id}`,
        source: "reddit",
        title: String(d.title),
        url: `https://www.reddit.com${d.permalink}`,
        snippet: clip(stripHtml(String(d.selftext ?? ""))),
        meta: `${d.subreddit_name_prefixed ?? "Reddit"} · ${ups.toLocaleString()} upvotes · ${comments} comments`,
        score: ups + comments * 2,
      };
    });
}

/** Q&A from Stack Overflow. */
export async function searchStackOverflow(
  query: string,
  signal: AbortSignal
): Promise<ResourceResult[]> {
  const url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(
    query
  )}&site=stackoverflow&pagesize=8&filter=default`;
  const data = (await getJson(url, signal)) as {
    items?: Record<string, unknown>[];
  };
  return (data.items ?? [])
    .filter((i) => i.title && i.link)
    .slice(0, 8)
    .map((i): ResourceResult => {
      const score = Number(i.score ?? 0);
      const answers = Number(i.answer_count ?? 0);
      return {
        id: `so:${i.question_id}`,
        source: "stackoverflow",
        title: decodeEntities(String(i.title)),
        url: String(i.link),
        snippet: "",
        meta: `${score} votes · ${answers} answer${answers === 1 ? "" : "s"}${
          i.is_answered ? " · accepted" : ""
        }`,
        score: score + answers,
      };
    });
}

/** Discussion threads from Hacker News (via Algolia). */
export async function searchHackerNews(
  query: string,
  signal: AbortSignal
): Promise<ResourceResult[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(
    query
  )}&tags=story&hitsPerPage=8`;
  const data = (await getJson(url, signal)) as {
    hits?: Record<string, unknown>[];
  };
  return (data.hits ?? [])
    .filter((h) => h.title)
    .slice(0, 8)
    .map((h): ResourceResult => {
      const points = Number(h.points ?? 0);
      const comments = Number(h.num_comments ?? 0);
      return {
        id: `hn:${h.objectID}`,
        source: "hackernews",
        title: String(h.title),
        url:
          (h.url as string) ||
          `https://news.ycombinator.com/item?id=${h.objectID}`,
        snippet: clip(stripHtml(String(h.story_text ?? ""))),
        meta: `${points} points · ${comments} comments`,
        score: points + comments,
      };
    });
}

/** Encyclopaedic background from Wikipedia. */
export async function searchWikipedia(
  query: string,
  signal: AbortSignal
): Promise<ResourceResult[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&format=json&srlimit=5&origin=*`;
  const data = (await getJson(url, signal)) as {
    query?: { search?: Record<string, unknown>[] };
  };
  return (data.query?.search ?? [])
    .filter((s) => s.title)
    .slice(0, 5)
    .map((s): ResourceResult => ({
      id: `wiki:${s.pageid}`,
      source: "wikipedia",
      title: String(s.title),
      url: `https://en.wikipedia.org/?curid=${s.pageid}`,
      snippet: clip(stripHtml(String(s.snippet ?? ""))),
      meta: `${Number(s.wordcount ?? 0).toLocaleString()} words`,
      score: 50,
    }));
}

/** Academic papers from arXiv (Atom XML, parsed best-effort). */
export async function searchArxiv(
  query: string,
  signal: AbortSignal
): Promise<ResourceResult[]> {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
    query
  )}&start=0&max_results=5`;
  const res = await fetch(url, {
    headers: COMMON_HEADERS,
    signal,
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`arxiv -> ${res.status}`);
  const xml = await res.text();

  const entries = xml.split("<entry>").slice(1);
  const pick = (block: string, tag: string) => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
    return m ? stripHtml(m[1]) : "";
  };
  return entries.slice(0, 5).map((block, i): ResourceResult => {
    const id = pick(block, "id");
    return {
      id: `arxiv:${id || i}`,
      source: "arxiv",
      title: pick(block, "title"),
      url: id || "https://arxiv.org",
      snippet: clip(pick(block, "summary")),
      meta: "Academic paper",
      score: 40,
    };
  });
}

export const PROVIDERS: Record<
  ResourceSource,
  (query: string, signal: AbortSignal) => Promise<ResourceResult[]>
> = {
  reddit: searchReddit,
  stackoverflow: searchStackOverflow,
  hackernews: searchHackerNews,
  wikipedia: searchWikipedia,
  arxiv: searchArxiv,
};
