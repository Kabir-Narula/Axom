import { route, parseBody, ok } from "@/lib/api";
import { documentSchema } from "@/lib/validation";
import { ingestDocument } from "@/lib/services/document-service";

// Document ingestion runs NLP extraction; keep the rate limit modest.
export const POST = route(
  async ({ user, req }) => {
    const input = await parseBody(req, documentSchema);
    const result = await ingestDocument({
      userId: user.id,
      courseId: input.courseId,
      title: input.title,
      kind: input.kind,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      contentText: input.contentText,
      pageCount: input.pageCount,
    });
    return ok(result, { status: 201 });
  },
  { rateLimit: { limit: 20, windowMs: 60_000 } }
);
