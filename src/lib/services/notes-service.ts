import { courseRepo } from "@/lib/repositories/courses";
import { noteRepo } from "@/lib/repositories/notes";
import { getAIProvider } from "@/lib/ai";
import { buildConceptContexts } from "./context";
import { ApiError } from "@/lib/api";
import type { NoteStyle } from "@/lib/validation";

const STYLE_LABEL: Record<NoteStyle, string> = {
  cornell: "Cornell Notes",
  mindmap: "Mind Map",
  eli5: "ELI5 Notes",
  exam: "Exam Review",
  formal: "Structured Summary",
  analogy: "Analogy Notes",
};

export async function generateNotes(input: {
  userId: string;
  courseId: string;
  documentId?: string;
  style: NoteStyle;
}) {
  const course = await courseRepo.findForUser(input.courseId, input.userId);
  if (!course) throw new ApiError(404, "Course not found.");

  const contexts = await buildConceptContexts(input.courseId, { limit: 30 });
  if (contexts.length === 0) {
    throw new ApiError(
      400,
      "Upload and process a document first — there's nothing to summarize yet."
    );
  }

  const ai = getAIProvider();
  const contentMd = await ai.generateNotes(contexts, input.style, course.title);

  const note = await noteRepo.create({
    courseId: input.courseId,
    documentId: input.documentId ?? null,
    title: `${course.title} — ${STYLE_LABEL[input.style]}`,
    style: input.style,
    contentMd,
    meta: { conceptCount: contexts.length, provider: ai.name },
  });

  return note;
}
