/**
 * Clean text extracted from PDFs before concept/quiz generation.
 * Strips recurring headers, page markers, and other layout noise that
 * otherwise becomes nonsense concept labels and quiz prompts.
 */

/** Extract text from a PDF buffer with page breaks preserved. */
export async function extractPdfText(
  buffer: Uint8Array
): Promise<{ text: string; pageCount: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(buffer);

  const perPage = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(perPage.text)
    ? perPage.text.map((p) => String(p ?? "").trim()).filter(Boolean)
    : [String(perPage.text ?? "").trim()].filter(Boolean);

  let text = pages.join("\n\n");
  const pageCount = perPage.totalPages || pages.length || 1;

  if (text.replace(/\s/g, "").length < 20) {
    const merged = await extractText(pdf, { mergePages: true });
    text = Array.isArray(merged.text)
      ? merged.text.join("\n")
      : String(merged.text ?? "");
  }

  return { text: text.trim(), pageCount };
}

function cleanPdfLine(line: string): string {
  return line
    .replace(/^UnderstandingScience\.org[\d\s]*(?:Thewoeorwd[^\s]*)?\s*/i, "")
    .replace(/UnderstandingScience\.org/gi, "")
    .trim();
}

export function normalizePdfText(raw: string): string {
  if (!raw.trim()) return "";

  let text = raw.replace(/\u0000/g, "");

  // Merged PDF text is often one line — re-introduce breaks before cleaning.
  if ((text.match(/\n/g) ?? []).length < 3) {
    text = text
      .replace(/(\s--\s*\d+\s+of\s+\d+\s*--\s*)/g, "\n$1\n")
      .replace(/(Understanding Science 101:[^?]*\?)/g, "\n$1\n")
      .replace(/([.!?])\s+(?=[A-Z“"'])/g, "$1\n");
  }

  const lines = text
    .split("\n")
    .map((line) => cleanPdfLine(line.trim()))
    .filter((line) => {
      if (!line) return false;
      if (/understandingscience\.org/i.test(line) && line.length < 160) return false;
      if (/^Understanding Science 101:\s*What is science\?:?\s*$/i.test(line))
        return false;
      if (/^photo credit/i.test(line)) return false;
      if (/^reference number:/i.test(line)) return false;
      if (/^--\s*\d+\s+of\s+\d+\s*--$/.test(line)) return false;
      return true;
    });

  text = lines.join("\n");
  text = text.replace(/([a-z])-\s+([a-z])/gi, "$1$2");
  text = text.replace(/[^\S\n]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/** Normalize only when output stays substantial; never wipe extracted text. */
export function normalizePdfTextSafe(raw: string): string {
  const trimmed = raw.replace(/\u0000/g, "").trim();
  if (trimmed.length < 20) return trimmed;
  const normalized = normalizePdfText(trimmed);
  return normalized.length >= Math.min(20, trimmed.length * 0.5)
    ? normalized
    : trimmed;
}

/** Drop lines that are almost certainly PDF layout garbage. */
export function isPdfNoiseLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (t.length < 3) return true;
  if (/^--\s*\d+\s+of\s+\d+\s*--$/.test(t)) return true;
  if (/understandingscience\.org/i.test(t) && t.length < 160) return true;
  if (/^photo credit/i.test(t)) return true;
  const letters = (t.match(/[a-zA-Z]/g) ?? []).length;
  if (letters / t.length < 0.45) return true;
  return false;
}
