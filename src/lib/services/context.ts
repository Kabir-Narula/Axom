import { knowledgeRepo } from "@/lib/repositories/knowledge";
import { documentRepo } from "@/lib/repositories/documents";
import type { ConceptContext } from "@/lib/ai/types";

/** Build AI concept contexts from a course's persisted knowledge nodes. */
export async function buildConceptContexts(
  courseId: string,
  opts: { weakFirst?: boolean; limit?: number } = {}
): Promise<ConceptContext[]> {
  const [nodes, courseText] = await Promise.all([
    knowledgeRepo.listByCourse(courseId),
    documentRepo.getCombinedTextForCourse(courseId),
  ]);

  let ordered = nodes;
  if (opts.weakFirst) {
    ordered = [...nodes].sort(
      (a, b) =>
        b.importance * (1 - b.mastery) - a.importance * (1 - a.mastery)
    );
  }
  const limited = opts.limit ? ordered.slice(0, opts.limit) : ordered;

  return limited.map((n) => ({
    label: n.label,
    summary: n.summary,
    keyTerms: n.keyTerms,
    difficulty: n.difficulty,
    // Full document text helps quiz stems avoid rhetorical questions from summaries.
    sourceText: courseText.length > 200 ? courseText : n.summary,
  }));
}
