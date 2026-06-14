import type { Difficulty, NoteStyle, QuestionType } from "@/lib/validation";

export interface ExtractedConcept {
  label: string;
  summary: string;
  keyTerms: string[];
  importance: number; // 0..1 exam likelihood
  difficulty: number; // 0..1
  sourceRef: string;
}

export interface ExtractedEdge {
  fromLabel: string;
  toLabel: string;
  relation: "prerequisite" | "related";
  weight: number;
}

export interface ExtractionResult {
  concepts: ExtractedConcept[];
  edges: ExtractedEdge[];
}

export interface GeneratedQuestion {
  type: QuestionType;
  prompt: string;
  options: string[];
  answer: string;
  rubric: string[]; // keywords for grading free-text answers
  explanation: string;
  difficulty: Difficulty;
  conceptLabel?: string;
}

export interface GeneratedCard {
  front: string;
  back: string;
  kind: "qa" | "cloze" | "concept";
  conceptLabel?: string;
}

export interface MicroLesson {
  diagnosis: string; // why the student's reasoning was likely wrong
  explanation: string; // the correct understanding
  tip: string; // how to avoid this mistake next time
}

export interface ConceptContext {
  label: string;
  summary: string;
  keyTerms: string[];
  difficulty: number;
  sourceText: string;
}

/**
 * Strategy interface for the intelligence layer. The heuristic implementation
 * works offline; the LLM implementation delegates to a model when configured.
 */
export interface AIProvider {
  readonly name: string;
  extractConcepts(text: string, opts: { maxConcepts?: number }): Promise<ExtractionResult>;
  generateNotes(concepts: ConceptContext[], style: NoteStyle, courseTitle: string): Promise<string>;
  generateCards(concepts: ConceptContext[]): Promise<GeneratedCard[]>;
  generateQuestions(
    concepts: ConceptContext[],
    opts: { count: number; difficulty: Difficulty; types: QuestionType[] }
  ): Promise<GeneratedQuestion[]>;
  explainMistake(input: {
    prompt: string;
    correctAnswer: string;
    studentAnswer: string;
    conceptSummary: string;
  }): Promise<MicroLesson>;
}
