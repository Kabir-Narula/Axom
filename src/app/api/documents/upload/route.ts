import { route, ok, ApiError } from "@/lib/api";
import { DOC_KINDS } from "@/lib/validation";
import { ingestDocument } from "@/lib/services/document-service";
import { normalizePdfTextSafe, extractPdfText } from "@/lib/pdf-text";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/octet-stream", // some browsers send this for .md
]);

export const POST = route(
  async ({ user, req }) => {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new ApiError(400, "Expected a multipart form upload.");
    }

    const file = form.get("file");
    const courseId = String(form.get("courseId") ?? "");
    const kindRaw = String(form.get("kind") ?? "notes");
    const kind = (DOC_KINDS as readonly string[]).includes(kindRaw)
      ? kindRaw
      : "notes";

    if (!courseId) throw new ApiError(400, "Missing course.");
    if (!(file instanceof File)) throw new ApiError(400, "No file provided.");
    if (file.size === 0) throw new ApiError(400, "The file is empty.");
    if (file.size > MAX_BYTES)
      throw new ApiError(413, "File is too large (max 15 MB).");

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    const isText =
      ALLOWED.has(file.type) ||
      /\.(txt|md|markdown)$/i.test(file.name);
    if (!isPdf && !isText) {
      throw new ApiError(415, "Only PDF, .txt and .md files are supported.");
    }

    let contentText = "";
    let pageCount = 1;
    const buffer = new Uint8Array(await file.arrayBuffer());

    if (isPdf) {
      try {
        const extracted = await extractPdfText(buffer);
        contentText = extracted.text;
        pageCount = extracted.pageCount;
      } catch {
        throw new ApiError(
          422,
          "Could not read this PDF (it may be scanned/image-only)."
        );
      }
    } else {
      contentText = new TextDecoder().decode(buffer);
    }

    contentText = contentText.replace(/\u0000/g, "").trim();
    if (isPdf) {
      contentText = normalizePdfTextSafe(contentText);
    }
    if (contentText.length < 20) {
      throw new ApiError(
        422,
        "Couldn't extract readable text from this file."
      );
    }

    const title = sanitizeTitle(file.name);
    const result = await ingestDocument({
      userId: user.id,
      courseId,
      title,
      kind,
      mimeType: file.type || "text/plain",
      sizeBytes: file.size,
      contentText: contentText.slice(0, 2_000_000),
      pageCount,
    });
    return ok(result, { status: 201 });
  },
  { rateLimit: { limit: 15, windowMs: 60_000 } }
);

function sanitizeTitle(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/[^\w\s.,()&]/g, "")
      .trim()
      .slice(0, 180) || "Untitled document"
  );
}
