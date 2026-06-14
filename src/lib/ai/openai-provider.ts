import type { NoteStyle, Difficulty, QuestionType } from "@/lib/validation";
import { QUESTION_TYPES } from "@/lib/validation";
import type {
  AIProvider,
  ConceptContext,
  ExtractionResult,
  GeneratedCard,
  GeneratedQuestion,
  MicroLesson,
} from "./types";
import { HeuristicProvider } from "./heuristic-provider";
import {
  isValidQuestion,
  repairQuestion,
  coerceQuestionTypeForText,
} from "./question-sanity";

/**
 * LLM-backed provider. Activated only when OPENAI_API_KEY is set. Every method
 * is wrapped so that any network/parsing failure transparently falls back to
 * the deterministic heuristic engine — the app never breaks because of the LLM.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private fallback = new HeuristicProvider();
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY ?? "";
    this.model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    this.baseUrl =
      process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  }

  private async chat(
    system: string,
    user: string,
    json: boolean
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.4,
          ...(json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}`);
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new Error("No content");
      return content;
    } finally {
      clearTimeout(timeout);
    }
  }

  async extractConcepts(
    text: string,
    opts: { maxConcepts?: number }
  ): Promise<ExtractionResult> {
    // Structured extraction is reliability-critical; the heuristic engine is
    // strong here and deterministic, so we keep it as the source of truth.
    return this.fallback.extractConcepts(text, opts);
  }

  async generateNotes(
    concepts: ConceptContext[],
    style: NoteStyle,
    courseTitle: string
  ): Promise<string> {
    try {
      const material = concepts
        .map((c) => `### ${c.label}\n${c.summary}\nKey terms: ${c.keyTerms.join(", ")}`)
        .join("\n\n");
      const styleGuide: Record<NoteStyle, string> = {
        cornell: "Cornell format: cue questions on the left, notes, then a summary line per topic.",
        mindmap: "A nested bullet mind-map radiating from the course title.",
        eli5: "Explain like I'm 5 — simple words, vivid everyday comparisons.",
        exam: "Exam-focused: high-yield facts, likely questions, terms to recall.",
        formal: "Formal textbook-style structured summary.",
        analogy: "Teach each concept through a concrete analogy.",
      };
      const content = await this.chat(
        "You are an expert tutor who writes clear, accurate study notes in Markdown. Never invent facts beyond the provided material.",
        `Course: ${courseTitle}\nStyle: ${styleGuide[style]}\n\nMaterial:\n${material}\n\nWrite the notes in Markdown now.`,
        false
      );
      return content.trim() || this.fallback.generateNotes(concepts, style, courseTitle);
    } catch {
      return this.fallback.generateNotes(concepts, style, courseTitle);
    }
  }

  async generateCards(concepts: ConceptContext[]): Promise<GeneratedCard[]> {
    return this.fallback.generateCards(concepts);
  }

  async generateQuestions(
    concepts: ConceptContext[],
    opts: { count: number; difficulty: Difficulty; types: QuestionType[] }
  ): Promise<GeneratedQuestion[]> {
    try {
      const material = concepts
        .slice(0, 16)
        .map((c) => `- ${c.label}: ${c.summary} [terms: ${c.keyTerms.join(", ")}]`)
        .join("\n");
      const content = await this.chat(
        "You are an exam author. Produce rigorous questions strictly grounded in the material. Respond with JSON only.",
        `Create ${opts.count} questions at "${opts.difficulty}" difficulty using these types: ${opts.types.join(", ")}.
Material:\n${material}\n
Return JSON: {"questions":[{"type","prompt","options":[],"answer","rubric":[],"explanation","difficulty","conceptLabel"}]}.
For mcq include exactly 4 options with one correct answer matching "answer". For non-mcq, options must be []. rubric = key grading keywords.
For truefalse: prompt must be a declarative factual claim (never a question). options must be ["True","False"]. Do NOT ask students to justify.`,
        true
      );
      const parsed = JSON.parse(content);
      const raw = Array.isArray(parsed?.questions) ? parsed.questions : [];
      const cleaned = raw
        .map((q: unknown) => this.coerceQuestion(q, opts.difficulty))
        .filter((q: GeneratedQuestion | null): q is GeneratedQuestion => q !== null)
        .filter((q: GeneratedQuestion) => isValidQuestion(q));
      if (cleaned.length === 0) throw new Error("No valid questions");
      return cleaned.slice(0, opts.count);
    } catch {
      return this.fallback.generateQuestions(concepts, opts);
    }
  }

  private coerceQuestion(q: unknown, fallbackDiff: Difficulty): GeneratedQuestion | null {
    if (!q || typeof q !== "object") return null;
    const o = q as Record<string, unknown>;
    let type = QUESTION_TYPES.includes(o.type as QuestionType)
      ? (o.type as QuestionType)
      : "short";
    const prompt = typeof o.prompt === "string" ? o.prompt : "";
    const answer = typeof o.answer === "string" ? o.answer : "";
    if (!prompt || !answer) return null;

    type = coerceQuestionTypeForText(type, prompt);

    const candidate: GeneratedQuestion = {
      type,
      prompt,
      options: Array.isArray(o.options)
        ? o.options.filter((x): x is string => typeof x === "string")
        : [],
      answer,
      rubric: Array.isArray(o.rubric)
        ? o.rubric.filter((x): x is string => typeof x === "string")
        : [],
      explanation: typeof o.explanation === "string" ? o.explanation : "",
      difficulty: (o.difficulty as Difficulty) ?? fallbackDiff,
      conceptLabel: typeof o.conceptLabel === "string" ? o.conceptLabel : undefined,
    };

    if (candidate.type === "truefalse") {
      const repaired = repairQuestion({
        ...candidate,
        options: ["True", "False"],
      });
      return repaired;
    }

    return candidate;
  }

  async explainMistake(input: {
    prompt: string;
    correctAnswer: string;
    studentAnswer: string;
    conceptSummary: string;
  }): Promise<MicroLesson> {
    try {
      const content = await this.chat(
        "You are a patient tutor. Diagnose WHY the student's reasoning went wrong, then fix the specific gap. Respond with JSON only.",
        `Question: ${input.prompt}\nCorrect answer: ${input.correctAnswer}\nConcept: ${input.conceptSummary}\nStudent answer: ${input.studentAnswer || "(left blank)"}\n
Return JSON: {"diagnosis","explanation","tip"}. diagnosis = why their thinking was wrong (not just "incorrect"). explanation = the correct understanding. tip = how to avoid this next time.`,
        true
      );
      const p = JSON.parse(content);
      if (
        typeof p?.diagnosis === "string" &&
        typeof p?.explanation === "string" &&
        typeof p?.tip === "string"
      ) {
        return p as MicroLesson;
      }
      throw new Error("Bad shape");
    } catch {
      return this.fallback.explainMistake(input);
    }
  }
}
