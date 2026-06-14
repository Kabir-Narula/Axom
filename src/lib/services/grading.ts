import { tokenize } from "@/lib/ai/nlp";
import { buildGradingRubric } from "@/lib/ai/question-sanity";

export interface GradeResult {
  correct: boolean;
  score: number; // 0..1 partial credit
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Grade an answer by question type.
 * - Objective types: exact / normalized match.
 * - Free-text types: rubric keyword coverage (partial credit), with a
 *   correctness threshold so "mostly right" still counts toward mastery.
 */
export function gradeAnswer(
  type: string,
  response: string,
  answer: string,
  rubric: string[]
): GradeResult {
  const res = normalize(response);
  if (!res) return { correct: false, score: 0 };

  switch (type) {
    case "mcq":
    case "truefalse": {
      const correct = res === normalize(answer);
      return { correct, score: correct ? 1 : 0 };
    }
    case "cloze": {
      const a = normalize(answer);
      const correct = res === a || res.includes(a) || a.includes(res);
      return { correct, score: correct ? 1 : 0 };
    }
    case "short":
    case "long":
    case "code":
    case "case":
    default: {
      const cleanedRubric =
        rubric.length > 0
          ? buildGradingRubric(answer, rubric)
          : buildGradingRubric(answer, []);
      const keywords =
        cleanedRubric.length > 0
          ? cleanedRubric.map(normalize)
          : tokenize(answer).slice(0, 6);
      if (keywords.length === 0) {
        const overlap = jaccard(tokenize(response), tokenize(answer));
        return { correct: overlap >= 0.4, score: Math.min(1, overlap * 1.5) };
      }
      // Very short answers shouldn't get partial credit from keyword hits.
      if (res.replace(/\s/g, "").length < 12) {
        return { correct: false, score: 0 };
      }
      const hits = keywords.filter((k) => k && res.includes(k)).length;
      const score = hits / keywords.length;
      return { correct: score >= 0.6, score: Math.min(1, score) };
    }
  }
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter += 1;
  return inter / (setA.size + setB.size - inter);
}
