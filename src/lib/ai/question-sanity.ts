import { splitSentences } from "./nlp";
import type { GeneratedQuestion } from "./types";
import type { QuestionType } from "@/lib/validation";

/** Whether text reads as an open question rather than a testable claim. */
export function isQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.endsWith("?")) return true;
  return /^(what|why|how|when|where|who|whom|whose|which|would|could|should|can|do|does|did|is|are|was|were|has|have|will|shall|if)\b/i.test(
    t
  );
}

/** A sentence suitable for True/False — declarative, grounded, not rhetorical. */
export function isDeclarativeStatement(text: string): boolean {
  const t = text.trim();
  if (t.length < 24 || t.length > 260) return false;
  if (isQuestion(t)) return false;
  if (/^(true or false|justify your answer)\b/i.test(t)) return false;
  // Must look like a factual claim, not a fragment or caption.
  if (
    !/\b(is|are|was|were|has|have|can|cannot|must|involves|requires|means|includes|allows|uses|helps|aims|relies|works|generates|provides|occurs|happens|leads|forms|contains|supports|depends|tests|explains|found|showed|suggested|demonstrates|involve|focuses|deal|build|make|learn|navigate|pick|choose)\b/i.test(
      t
    )
  ) {
    return false;
  }
  return true;
}

/** Pull declarative sentences from material, best-first by length/clarity. */
export function pickDeclarativeSentences(text: string, limit = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of splitSentences(text)) {
    const t = s.trim();
    const key = t.toLowerCase();
    if (seen.has(key) || !isDeclarativeStatement(t)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out.sort((a, b) => {
    // Prefer medium-length, complete-sounding claims.
    const score = (x: string) =>
      Math.abs(x.length - 120) * -1 + (x.endsWith(".") ? 10 : 0);
    return score(b) - score(a);
  });
}

/** Build a fallback claim when source text only yields questions. */
export function synthesizeStatement(label: string, keyTerms: string[]): string {
  const term = keyTerms.find((t) => t.length > 3);
  if (term) {
    return `${label} is associated with ${term} and related ideas from the course material.`;
  }
  return `${label} is a key concept described in the uploaded material.`;
}

/** Validate a generated question before it reaches the student. */
export function isValidQuestion(q: GeneratedQuestion): boolean {
  if (!q.prompt.trim() || !q.answer.trim()) return false;

  if (q.type === "truefalse") {
    if (q.options.length !== 2) return false;
    const opts = q.options.map((o) => o.toLowerCase());
    if (!opts.includes("true") || !opts.includes("false")) return false;
    if (!["true", "false"].includes(q.answer.toLowerCase())) return false;
    // Strip the T/F prefix and check the claim itself.
    const claim = q.prompt
      .replace(/^true\s*or\s*false\s*[—:-]\s*/i, "")
      .replace(/\s*justify your answer\.?\s*$/i, "")
      .trim();
    if (isQuestion(claim) || !isDeclarativeStatement(claim)) return false;
  }

  if (q.type === "mcq") {
    if (q.options.length < 3) return false;
    if (!q.options.includes(q.answer)) return false;
  }

  return true;
}

/** Normalize T/F prompts to a clean, consistent format. */
export function normalizeTrueFalsePrompt(claim: string): string {
  const cleaned = claim
    .replace(/^true\s*or\s*false\s*[—:-]\s*/i, "")
    .replace(/\s*justify your answer\.?\s*$/i, "")
    .trim();
  return `True or False: ${cleaned}`;
}

export function repairQuestion(q: GeneratedQuestion): GeneratedQuestion | null {
  if (q.type !== "truefalse") return q;

  const claim = q.prompt
    .replace(/^true\s*or\s*false\s*[—:-]\s*/i, "")
    .replace(/\s*justify your answer\.?\s*$/i, "")
    .trim();

  if (isDeclarativeStatement(claim)) {
    return {
      ...q,
      prompt: normalizeTrueFalsePrompt(claim),
      options: ["True", "False"],
      answer: q.answer === "False" ? "False" : "True",
    };
  }
  return null;
}

export function coerceQuestionTypeForText(
  type: QuestionType,
  text: string
): QuestionType {
  if (type === "truefalse" && isQuestion(text)) return "short";
  return type;
}
