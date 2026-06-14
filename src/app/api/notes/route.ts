import { route, parseBody, ok } from "@/lib/api";
import { generateNotesSchema } from "@/lib/validation";
import { generateNotes } from "@/lib/services/notes-service";

export const POST = route(
  async ({ user, req }) => {
    const input = await parseBody(req, generateNotesSchema);
    const note = await generateNotes({
      userId: user.id,
      courseId: input.courseId,
      documentId: input.documentId,
      style: input.style,
    });
    return ok({ id: note.id }, { status: 201 });
  },
  { rateLimit: { limit: 20, windowMs: 60_000 } }
);
