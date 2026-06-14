import { isQuestion } from "./question-sanity";

const FRAGMENT_START =
  /^(beyond|to|in order|for example|look at|see also|let's|let us|we will|we'll|now|here|there|this section|that section|in this|on this|at this|as we|while we|before we|after we|when we|where we|how we|what we|why we|who we|which we|if we|so we|but we|and we|or we|yet we|still we|even we|only we|just we|also we|well we|then we|next we|first we|finally we|generally|typically|usually|often|sometimes|less familiar|more familiar|science checklist|understanding science)\b/i;

/** Reject headings that become nonsense concept names after PDF extraction. */
export function isValidConceptLabel(label: string): boolean {
  const t = label.trim();
  if (t.length < 4 || t.length > 100) return false;
  if (isQuestion(t)) return false;
  if (/^(part|section|concept|chapter|slide|page)\s+\d+$/i.test(t)) return false;
  if (/understandingscience|photo credit|prototype:|checklist$/i.test(t)) return false;
  if (FRAGMENT_START.test(t)) return false;
  if (/,\s*(and|or|but)\s*$/i.test(t)) return false;
  if (/^(and|or|but)\s+/i.test(t)) return false;
  const letters = (t.match(/[a-zA-Z]/g) ?? []).length;
  if (letters / t.length < 0.5) return false;
  // Garbled OCR-ish tokens
  if (/\b(thewoeorwd|woeorwd)\b/i.test(t)) return false;
  // Repeated generic stems (e.g. "Science Checklist Science")
  const words = t.toLowerCase().split(/\s+/);
  if (words.length >= 2 && new Set(words).size < words.length) return false;
  return true;
}
