/**
 * Lightweight, dependency-free NLP toolkit.
 *
 * This is the deterministic engine behind Axom's document intelligence when no
 * LLM key is configured: sentence segmentation, stopword-aware tokenization,
 * TF-IDF, keyphrase extraction, extractive summarization, and emphasis
 * detection (used to estimate what a professor is likely to test).
 */

export const STOPWORDS = new Set(
  `a about above after again against all am an and any are aren't as at be because been before being below between both but by can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves also using used use e.g i.e etc within may might one two will shall must many much may'`.split(
    /\s+/
  )
);

const CUE_WORDS = [
  "important",
  "key",
  "note",
  "remember",
  "crucial",
  "essential",
  "definition",
  "define",
  "theorem",
  "lemma",
  "proof",
  "principle",
  "law",
  "rule",
  "must",
  "always",
  "never",
  "exam",
  "test",
  "fundamental",
  "core",
  "critical",
  "warning",
  "caution",
  "recall",
  "notably",
  "significant",
];

export function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  // Split on sentence terminators while keeping abbreviations mostly intact.
  const parts = cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“'])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts;
}

export function splitSections(text: string): { heading: string; body: string }[] {
  const lines = text.split(/\r?\n/);
  const sections: { heading: string; body: string }[] = [];
  let current: { heading: string; body: string } | null = null;

  const isHeading = (line: string) => {
    const t = line.trim();
    if (!t || t.length > 80) return false;
    // Markdown heading, numbered heading, ALL CAPS, or Title Case short line.
    if (/^#{1,6}\s+/.test(t)) return true;
    if (/^(\d+[.)]|chapter|section|topic|unit|lecture|slide)\b/i.test(t))
      return true;
    if (/^[A-Z0-9][A-Za-z0-9 ,&/'-]{2,70}$/.test(t) && !/[.!?]$/.test(t)) {
      const words = t.split(/\s+/);
      if (words.length <= 9) return true;
    }
    return false;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (isHeading(line)) {
      if (current && current.body.trim()) sections.push(current);
      current = { heading: line.replace(/^#{1,6}\s+/, "").trim(), body: "" };
    } else {
      if (!current) current = { heading: "", body: "" };
      current.body += line + " ";
    }
  }
  if (current && current.body.trim()) sections.push(current);

  // If no headings detected, fall back to fixed-size chunking by sentences.
  if (sections.length === 0) {
    const sentences = splitSentences(text);
    const chunkSize = 6;
    for (let i = 0; i < sentences.length; i += chunkSize) {
      sections.push({
        heading: "",
        body: sentences.slice(i, i + chunkSize).join(" "),
      });
    }
  }
  return sections;
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z'-]+/g) ?? []).filter(
    (t) => t.length > 2 && !STOPWORDS.has(t)
  );
}

export function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

/** Compute TF-IDF scores for terms across a set of documents (sentences). */
export function computeTfIdf(docs: string[][]): Map<string, number>[] {
  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const term of new Set(doc)) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const N = docs.length || 1;
  return docs.map((doc) => {
    const tf = termFrequency(doc);
    const scores = new Map<string, number>();
    const len = doc.length || 1;
    for (const [term, count] of tf) {
      const idf = Math.log(1 + N / (1 + (df.get(term) ?? 0)));
      scores.set(term, (count / len) * idf);
    }
    return scores;
  });
}

/**
 * Extract weighted keyphrases (uni/bi/tri-grams) from text using term
 * frequency, phrase length, and capitalization cues.
 */
export function extractKeyphrases(text: string, limit = 8): string[] {
  const sentences = splitSentences(text);
  const phraseScores = new Map<string, number>();
  const unigramFreq = termFrequency(tokenize(text));

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    for (let n = 3; n >= 1; n--) {
      for (let i = 0; i + n <= words.length; i++) {
        const gram = words.slice(i, i + n);
        const norm = gram
          .map((w) => w.replace(/[^A-Za-z0-9'-]/g, "").toLowerCase())
          .filter(Boolean);
        if (norm.length !== n) continue;
        if (STOPWORDS.has(norm[0]) || STOPWORDS.has(norm[n - 1])) continue;
        if (norm.every((w) => w.length <= 2)) continue;
        const phrase = norm.join(" ");
        const base = norm.reduce(
          (sum, w) => sum + (unigramFreq.get(w) ?? 0),
          0
        );
        if (base === 0) continue;
        const lengthBoost = 1 + (n - 1) * 0.6;
        const capBoost = /[A-Z]/.test(gram.join("")) ? 1.2 : 1;
        phraseScores.set(
          phrase,
          (phraseScores.get(phrase) ?? 0) + base * lengthBoost * capBoost
        );
      }
    }
  }

  // Prefer longer phrases by removing unigrams that are subsumed by a kept
  // multi-word phrase.
  const sorted = [...phraseScores.entries()].sort((a, b) => b[1] - a[1]);
  const kept: string[] = [];
  for (const [phrase] of sorted) {
    if (kept.length >= limit) break;
    if (kept.some((k) => k.includes(phrase) && k !== phrase)) continue;
    kept.push(phrase);
  }
  return kept.map(titleCasePhrase);
}

/** Extractive summary: rank sentences by TF-IDF mass + position + cue words. */
export function summarize(text: string, maxSentences = 3): string[] {
  const sentences = splitSentences(text);
  if (sentences.length <= maxSentences) return sentences;

  const tokenized = sentences.map(tokenize);
  const tfidf = computeTfIdf(tokenized);

  const scored = sentences.map((sentence, i) => {
    let score = 0;
    for (const v of tfidf[i].values()) score += v;
    score /= Math.sqrt(tokenized[i].length || 1);
    // Position bias: early sentences often carry topic statements.
    score *= 1 + Math.max(0, (sentences.length - i) / sentences.length) * 0.25;
    // Cue words signal importance.
    const lower = sentence.toLowerCase();
    if (CUE_WORDS.some((c) => lower.includes(c))) score *= 1.3;
    // Penalize rhetorical/open questions — they make bad summaries and T/F stems.
    if (sentence.trim().endsWith("?")) score *= 0.15;
    else if (/^(what|why|how|when|where|who|would|could|should|can|do|does|did)\b/i.test(sentence.trim()))
      score *= 0.35;
    const wc = sentence.split(/\s+/).length;
    if (wc < 5 || wc > 45) score *= 0.7;
    return { sentence, score, i };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.i - b.i)
    .map((s) => s.sentence);
}

/**
 * Estimate exam-importance (0..1) for a chunk of text from emphasis signals:
 * cue words, term repetition (relative to doc), heading presence, and the
 * density of capitalized/technical terms.
 */
export function emphasisScore(
  text: string,
  hasHeading: boolean,
  globalFreq: Map<string, number>
): number {
  const lower = text.toLowerCase();
  let score = 0.4;

  const cueHits = CUE_WORDS.filter((c) => lower.includes(c)).length;
  score += Math.min(cueHits * 0.08, 0.24);

  if (hasHeading) score += 0.1;

  const tokens = tokenize(text);
  if (tokens.length) {
    const repeated = tokens.filter((t) => (globalFreq.get(t) ?? 0) >= 3).length;
    score += Math.min((repeated / tokens.length) * 0.4, 0.2);
  }

  // Definitions and formulas are high-yield.
  if (/\b(is defined as|refers to|means that|is a|are the)\b/.test(lower))
    score += 0.06;
  if (/[=∑∫√≤≥±→]/.test(text) || /\b\d+\s*[%]?\b/.test(text)) score += 0.04;

  return Math.max(0, Math.min(1, score));
}

/** Estimate intrinsic difficulty (0..1) from lexical + structural complexity. */
export function difficultyScore(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return 0.5;
  const avgLen = words.reduce((s, w) => s + w.length, 0) / words.length;
  const longWords = words.filter((w) => w.length >= 9).length / words.length;
  const symbols = (text.match(/[=∑∫√≤≥±→{}()[\]]/g) ?? []).length / words.length;
  const sentences = splitSentences(text);
  const avgSentLen = words.length / (sentences.length || 1);

  const score =
    (avgLen - 4) / 6 * 0.3 +
    longWords * 0.3 +
    Math.min(symbols, 0.3) * 0.2 +
    Math.min(avgSentLen / 30, 1) * 0.2;
  return Math.max(0.1, Math.min(1, score));
}

export function titleCasePhrase(phrase: string): string {
  return phrase
    .split(" ")
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Pull a concise definition-like sentence for a term, if present. */
export function findDefinition(term: string, text: string): string | null {
  const sentences = splitSentences(text);
  const t = term.toLowerCase();
  for (const s of sentences) {
    const lower = s.toLowerCase();
    if (
      lower.includes(t) &&
      /\b(is|are|refers to|defined as|means|describes|represents)\b/.test(lower)
    ) {
      return s;
    }
  }
  return null;
}
