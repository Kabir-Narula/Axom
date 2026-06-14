import type { NoteStyle, Difficulty, QuestionType } from "@/lib/validation";
import {
  splitSections,
  splitSentences,
  summarize,
  extractKeyphrases,
  emphasisScore,
  difficultyScore,
  termFrequency,
  tokenize,
  findDefinition,
  titleCasePhrase,
} from "./nlp";
import {
  pickDeclarativeSentences,
  synthesizeStatement,
  normalizeTrueFalsePrompt,
  isValidQuestion,
  isQuestion,
} from "./question-sanity";
import { seededShuffle, seededRandom } from "@/lib/utils";
import type {
  AIProvider,
  ConceptContext,
  ExtractionResult,
  ExtractedConcept,
  ExtractedEdge,
  GeneratedCard,
  GeneratedQuestion,
  MicroLesson,
} from "./types";

/**
 * Deterministic, offline intelligence engine. Every method produces real,
 * useful output derived from the source material — no network, no API key.
 */
export class HeuristicProvider implements AIProvider {
  readonly name = "heuristic";

  async extractConcepts(
    text: string,
    opts: { maxConcepts?: number }
  ): Promise<ExtractionResult> {
    const max = opts.maxConcepts ?? 24;
    const sections = splitSections(text);
    const globalFreq = termFrequency(tokenize(text));

    const concepts: ExtractedConcept[] = [];
    let index = 0;
    for (const section of sections) {
      index += 1;
      const body = section.body.trim();
      if (body.split(/\s+/).length < 6) continue;

      const keyTerms = extractKeyphrases(body, 6);
      const label =
        cleanLabel(section.heading) ||
        keyTerms[0] ||
        titleCasePhrase(tokenize(body).slice(0, 3).join(" ")) ||
        `Concept ${index}`;

      const summarySentences = summarize(body, 3);
      const summary = summarySentences.join(" ");
      if (!summary) continue;

      concepts.push({
        label: label.slice(0, 120),
        summary,
        keyTerms,
        importance: emphasisScore(body, Boolean(section.heading), globalFreq),
        difficulty: difficultyScore(body),
        sourceRef: section.heading
          ? `Section: ${cleanLabel(section.heading)}`
          : `Part ${index}`,
      });
    }

    // Merge near-duplicate concepts (same label), keep the most important.
    const byLabel = new Map<string, ExtractedConcept>();
    for (const c of concepts) {
      const key = c.label.toLowerCase();
      const existing = byLabel.get(key);
      if (!existing || c.importance > existing.importance) byLabel.set(key, c);
    }

    const ranked = [...byLabel.values()]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, max);

    const edges = this.buildEdges(ranked);
    return { concepts: ranked, edges };
  }

  private buildEdges(concepts: ExtractedConcept[]): ExtractedEdge[] {
    const edges: ExtractedEdge[] = [];
    const termSets = concepts.map(
      (c) => new Set(c.keyTerms.map((t) => t.toLowerCase()))
    );
    for (let i = 0; i < concepts.length; i++) {
      for (let j = 0; j < concepts.length; j++) {
        if (i === j) continue;
        const shared = [...termSets[i]].filter((t) => termSets[j].has(t));
        if (shared.length === 0) continue;
        const weight = Math.min(
          1,
          shared.length / Math.max(termSets[i].size, 1)
        );
        // Lower-difficulty concept is treated as a prerequisite of a harder,
        // related one; otherwise it's a lateral "related" edge.
        const relation =
          concepts[i].difficulty + 0.15 < concepts[j].difficulty
            ? "prerequisite"
            : "related";
        if (relation === "related" && i > j) continue; // dedupe lateral edges
        edges.push({
          fromLabel: concepts[i].label,
          toLabel: concepts[j].label,
          relation,
          weight,
        });
      }
    }
    return edges;
  }

  async generateNotes(
    concepts: ConceptContext[],
    style: NoteStyle,
    courseTitle: string
  ): Promise<string> {
    if (concepts.length === 0)
      return "_No content available to generate notes from yet._";

    switch (style) {
      case "cornell":
        return this.cornellNotes(concepts, courseTitle);
      case "mindmap":
        return this.mindmapNotes(concepts, courseTitle);
      case "eli5":
        return this.eli5Notes(concepts);
      case "exam":
        return this.examNotes(concepts);
      case "analogy":
        return this.analogyNotes(concepts);
      case "formal":
      default:
        return this.formalNotes(concepts, courseTitle);
    }
  }

  private cornellNotes(concepts: ConceptContext[], title: string): string {
    const lines = [`# ${title} — Cornell Notes\n`];
    for (const c of concepts) {
      lines.push(`## ${c.label}`);
      lines.push("");
      lines.push("**Cues**");
      lines.push(
        c.keyTerms.length
          ? c.keyTerms.map((t) => `- ${t}?`).join("\n")
          : "- Key idea?"
      );
      lines.push("");
      lines.push("**Notes**");
      for (const s of splitSentences(c.summary)) lines.push(`- ${s}`);
      lines.push("");
      lines.push(
        `**Summary:** ${summarize(c.summary, 1)[0] ?? c.summary}`
      );
      lines.push("");
    }
    return lines.join("\n");
  }

  private mindmapNotes(concepts: ConceptContext[], title: string): string {
    const lines = [`# ${title} — Mind Map\n`, `- **${title}**`];
    for (const c of concepts) {
      lines.push(`  - **${c.label}**`);
      for (const t of c.keyTerms.slice(0, 4)) lines.push(`    - ${t}`);
    }
    return lines.join("\n");
  }

  private eli5Notes(concepts: ConceptContext[]): string {
    const lines = ["# Explain Like I'm 5\n"];
    for (const c of concepts) {
      const simple = simplify(summarize(c.summary, 1)[0] ?? c.summary);
      lines.push(`## ${c.label}`);
      lines.push(
        `Think of **${c.label.toLowerCase()}** like this: ${simple} In short, it's about ${
          c.keyTerms[0]?.toLowerCase() ?? "the main idea"
        }.`
      );
      lines.push("");
    }
    return lines.join("\n");
  }

  private examNotes(concepts: ConceptContext[]): string {
    const ranked = [...concepts].sort((a, b) => b.difficulty - a.difficulty);
    const lines = ["# Exam-Focused Review\n", "_Ordered by likely difficulty._\n"];
    for (const c of ranked) {
      lines.push(`## ${c.label}`);
      lines.push(`**Must know:** ${summarize(c.summary, 2).join(" ")}`);
      if (c.keyTerms.length)
        lines.push(`**Terms to recall:** ${c.keyTerms.join(", ")}`);
      lines.push(
        `**Likely question:** "Explain ${c.label.toLowerCase()} and why it matters."`
      );
      lines.push("");
    }
    return lines.join("\n");
  }

  private analogyNotes(concepts: ConceptContext[]): string {
    const analogies = [
      "a recipe you follow step by step",
      "a city map guiding you between places",
      "building blocks stacking into something bigger",
      "a filing cabinet keeping things organized",
      "a relay race passing the baton along",
    ];
    const lines = ["# Learn by Analogy\n"];
    concepts.forEach((c, i) => {
      lines.push(`## ${c.label}`);
      lines.push(
        `Imagine ${c.label.toLowerCase()} as ${analogies[i % analogies.length]}. ${
          summarize(c.summary, 1)[0] ?? c.summary
        }`
      );
      lines.push("");
    });
    return lines.join("\n");
  }

  private formalNotes(concepts: ConceptContext[], title: string): string {
    const lines = [`# ${title} — Structured Summary\n`];
    concepts.forEach((c, i) => {
      lines.push(`## ${i + 1}. ${c.label}`);
      for (const s of summarize(c.summary, 3)) lines.push(s + "\n");
      if (c.keyTerms.length)
        lines.push(`**Key terms:** ${c.keyTerms.join(", ")}\n`);
    });
    return lines.join("\n");
  }

  async generateCards(concepts: ConceptContext[]): Promise<GeneratedCard[]> {
    const cards: GeneratedCard[] = [];
    for (const c of concepts) {
      const def = summarize(c.summary, 1)[0] ?? c.summary;
      cards.push({
        front: `What is ${c.label}?`,
        back: def,
        kind: "qa",
        conceptLabel: c.label,
      });

      // Cloze from a definitional sentence if a key term appears in it.
      const term = c.keyTerms[0];
      if (term) {
        const sentence = findDefinition(term, c.sourceText) ?? def;
        if (sentence.toLowerCase().includes(term.toLowerCase())) {
          const cloze = blankOut(sentence, term);
          cards.push({
            front: cloze,
            back: term,
            kind: "cloze",
            conceptLabel: c.label,
          });
        }
      }
    }
    return cards;
  }

  async generateQuestions(
    concepts: ConceptContext[],
    opts: { count: number; difficulty: Difficulty; types: QuestionType[] }
  ): Promise<GeneratedQuestion[]> {
    if (concepts.length === 0) return [];
    const questions: GeneratedQuestion[] = [];
    const ranked = [...concepts].sort(
      (a, b) => b.difficulty + seededRandom(b.label) - (a.difficulty + seededRandom(a.label))
    );

    let i = 0;
    const maxAttempts = ranked.length * opts.types.length * 4;
    while (questions.length < opts.count && i < maxAttempts) {
      const concept = ranked[i % ranked.length];
      const type = opts.types[i % opts.types.length];
      i += 1;
      const q = this.makeQuestion(concept, type, opts.difficulty, concepts);
      if (q && isValidQuestion(q)) questions.push(q);
    }
    return questions.slice(0, opts.count);
  }

  private makeQuestion(
    concept: ConceptContext,
    type: QuestionType,
    difficulty: Difficulty,
    all: ConceptContext[]
  ): GeneratedQuestion | null {
    const def = summarize(concept.summary, 1)[0] ?? concept.summary;
    const base = {
      difficulty,
      conceptLabel: concept.label,
      rubric: concept.keyTerms.slice(0, 5).map((t) => t.toLowerCase()),
    };

    switch (type) {
      case "mcq": {
        const distractors = seededShuffle(
          all.filter((c) => c.label !== concept.label),
          concept.label
        )
          .slice(0, 3)
          .map((c) => clip(summarize(c.summary, 1)[0] ?? c.summary, 120));
        if (distractors.length < 2) return null;
        const correct = clip(def, 120);
        const options = seededShuffle(
          [correct, ...distractors],
          concept.label + "opts"
        );
        return {
          ...base,
          type: "mcq",
          prompt:
            difficulty === "trick"
              ? `Which statement most accurately describes ${concept.label}? (Read all options carefully.)`
              : `Which of the following best describes ${concept.label}?`,
          options,
          answer: correct,
          explanation: `${concept.label}: ${def}`,
        };
      }
      case "truefalse": {
        const candidates = [
          ...pickDeclarativeSentences(concept.summary),
          ...pickDeclarativeSentences(concept.sourceText),
        ];
        let statement = candidates[0];
        if (!statement) {
          const def = summarize(concept.summary, 1)[0] ?? concept.summary;
          statement = isQuestion(def)
            ? synthesizeStatement(concept.label, concept.keyTerms)
            : def;
        }
        if (isQuestion(statement)) return null;

        const flip = seededRandom(concept.label + "tf") > 0.5;
        const claim = flip ? negate(statement) : statement;
        if (isQuestion(claim)) return null;

        return {
          ...base,
          type: "truefalse",
          prompt: normalizeTrueFalsePrompt(claim),
          options: ["True", "False"],
          answer: flip ? "False" : "True",
          explanation: `The accurate statement is: ${statement}`,
        };
      }
      case "cloze": {
        const term = concept.keyTerms[0];
        if (!term) return null;
        const sentence = findDefinition(term, concept.sourceText) ?? def;
        return {
          ...base,
          type: "cloze",
          prompt: `Fill in the blank: ${blankOut(sentence, term)}`,
          options: [],
          answer: term,
          explanation: `The missing term is "${term}". ${def}`,
        };
      }
      case "short":
        return {
          ...base,
          type: "short",
          prompt: `In 2–3 sentences, explain ${concept.label}.`,
          options: [],
          answer: def,
          explanation: `A strong answer covers: ${concept.keyTerms.join(", ") || def}.`,
        };
      case "long":
        return {
          ...base,
          type: "long",
          prompt: `Discuss ${concept.label} in depth. Address: ${
            concept.keyTerms.slice(0, 3).join(", ") || "its core ideas"
          }, and explain why it matters.`,
          options: [],
          answer: concept.summary,
          explanation: `Cover these points: ${concept.keyTerms.join(", ") || def}.`,
        };
      case "code":
        return {
          ...base,
          type: "code",
          prompt: `Write a short code snippet or pseudocode that demonstrates the idea of "${concept.label}". Explain each step in a comment.`,
          options: [],
          answer: `A correct solution applies ${concept.label.toLowerCase()} using: ${concept.keyTerms.join(", ")}.`,
          explanation: `Look for correct use of ${concept.keyTerms.join(", ") || "the core mechanism"} and clear, working logic.`,
        };
      case "case":
        return {
          ...base,
          type: "case",
          prompt: `Scenario: A situation requires applying ${concept.label}. Describe how you would approach it and what outcome you'd expect.`,
          options: [],
          answer: def,
          explanation: `A good response applies ${concept.keyTerms.join(", ") || concept.label} to the scenario.`,
        };
      default:
        return null;
    }
  }

  async explainMistake(input: {
    prompt: string;
    correctAnswer: string;
    studentAnswer: string;
    conceptSummary: string;
  }): Promise<MicroLesson> {
    const correctTerms = new Set(tokenize(input.correctAnswer + " " + input.conceptSummary));
    const studentTerms = new Set(tokenize(input.studentAnswer));
    const missing = [...correctTerms].filter((t) => !studentTerms.has(t)).slice(0, 5);
    const extra = [...studentTerms].filter((t) => !correctTerms.has(t)).slice(0, 4);

    const blank = input.studentAnswer.trim().length === 0;

    const diagnosis = blank
      ? "You left this blank — that usually means the concept hasn't moved into recall memory yet. Recognizing it isn't the same as being able to produce it."
      : missing.length
        ? `Your answer missed key ideas: ${missing.join(", ")}. This suggests you grasped part of the picture but not the connections that make it complete.`
        : extra.length
          ? `You included ideas (${extra.join(", ")}) that aren't central here — a sign of mixing this concept up with a neighbouring one.`
          : "Your answer was close. The gap is in precision rather than understanding.";

    return {
      diagnosis,
      explanation: input.conceptSummary || input.correctAnswer,
      tip: missing.length
        ? `Re-study with these anchors in mind: ${missing.join(", ")}. Then try to re-explain it out loud (the Feynman technique).`
        : "Try explaining this concept from scratch without looking — if you can teach it simply, you own it.",
    };
  }
}

// ---- helpers ----

function cleanLabel(heading: string): string {
  return heading
    .replace(/^#{1,6}\s+/, "")
    .replace(/^(\d+[.)]|chapter|section|topic|unit|lecture|slide)\s*:?\s*/i, "")
    .trim();
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trim() + "…";
}

function blankOut(sentence: string, term: string): string {
  const re = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
  if (re.test(sentence)) return sentence.replace(re, "_____");
  return `${clip(sentence, 160)} (term: _____)`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function negate(sentence: string): string {
  if (/\bis not\b/.test(sentence)) return sentence.replace(/\bis not\b/, "is");
  if (/\bis\b/.test(sentence)) return sentence.replace(/\bis\b/, "is not");
  if (/\bare\b/.test(sentence)) return sentence.replace(/\bare\b/, "are not");
  if (/\bcan\b/.test(sentence)) return sentence.replace(/\bcan\b/, "cannot");
  return "It is false that " + sentence.charAt(0).toLowerCase() + sentence.slice(1);
}

function simplify(sentence: string): string {
  return sentence
    .replace(/\butil(ize|ise)s?\b/gi, "uses")
    .replace(/\bdemonstrates?\b/gi, "shows")
    .replace(/\bsubsequently\b/gi, "then")
    .replace(/\btherefore\b/gi, "so")
    .replace(/\bin order to\b/gi, "to");
}
