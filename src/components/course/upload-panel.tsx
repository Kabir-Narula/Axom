"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ClipboardType,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, ApiClientError } from "@/lib/client";
import { DOC_KINDS } from "@/lib/validation";
import { cn, formatShortDate } from "@/lib/utils";
import type { DocumentView } from "./types";

export function UploadPanel({
  courseId,
  documents,
}: {
  courseId: string;
  documents: DocumentView[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState("slides");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<"file" | "paste">("file");

  async function uploadFile(file: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("courseId", courseId);
    fd.append("kind", kind);
    try {
      const res = await api<{ conceptCount: number; cardCount: number }>(
        "/api/documents/upload",
        { method: "POST", formData: fd }
      );
      toast(
        `Processed — ${res.conceptCount} concept${res.conceptCount === 1 ? "" : "s"}, ${res.cardCount} cards.${
          res.conceptCount < 4
            ? " Tip: if this looks low, try re-uploading the PDF."
            : ""
        }`,
        res.conceptCount === 0 ? "info" : "success"
      );
      router.refresh();
    } catch (err) {
      toast(
        err instanceof ApiClientError ? err.message : "Upload failed.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  async function pasteText(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const contentText = String(form.get("contentText") ?? "").trim();
    if (title.length < 1 || contentText.length < 20) {
      toast("Add a title and at least a paragraph of content.", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ conceptCount: number; cardCount: number }>(
        "/api/documents",
        {
          method: "POST",
          body: {
            courseId,
            title,
            kind,
            contentText,
            mimeType: "text/plain",
            sizeBytes: contentText.length,
            pageCount: 1,
          },
        }
      );
      toast(`Processed — ${res.conceptCount} concepts created.`, "success");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : "Failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-5 rounded-lg border border-border bg-card p-6">
        <div className="flex gap-1">
          <Button
            variant={mode === "file" ? "subtle" : "ghost"}
            size="sm"
            onClick={() => setMode("file")}
          >
            <UploadCloud /> Upload file
          </Button>
          <Button
            variant={mode === "paste" ? "subtle" : "ghost"}
            size="sm"
            onClick={() => setMode("paste")}
          >
            <ClipboardType /> Paste text
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Material type</Label>
          <div className="flex flex-wrap gap-2">
            {DOC_KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs capitalize transition-colors",
                  kind === k
                    ? "border-[#3f3f46] bg-secondary text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {mode === "file" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) uploadFile(file);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-6 py-12 text-center transition-colors",
              dragging
                ? "border-brand bg-brand/5"
                : "border-border hover:border-[#3f3f46]"
            )}
            onClick={() => !busy && fileInput.current?.click()}
          >
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,.md,.markdown"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
                e.target.value = "";
              }}
            />
            {busy ? (
              <Loader2 className="mb-3 size-6 animate-spin text-muted-foreground" />
            ) : (
              <UploadCloud
                className="mb-3 size-6 text-muted-foreground"
                strokeWidth={1.5}
              />
            )}
            <p className="text-sm font-medium text-foreground">
              {busy
                ? "Processing your document…"
                : "Drop a PDF, .txt or .md — or click to browse"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Axom extracts concepts and builds cards automatically. Max 15 MB.
            </p>
          </div>
        ) : (
          <form onSubmit={pasteText} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Lecture 4 — Graph traversal"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contentText">Content</Label>
              <Textarea
                id="contentText"
                name="contentText"
                rows={8}
                placeholder="Paste your notes, a chapter, or slide text here…"
              />
            </div>
            <Button type="submit" loading={busy}>
              Process text
            </Button>
          </form>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Materials ({documents.length})
        </h3>
        {documents.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" strokeWidth={1.5} />}
            title="No materials yet"
            description="Upload your first document to populate this course's knowledge graph."
          />
        ) : (
          <div className="space-y-2">
            {documents.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileText
                    className="size-4 shrink-0 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {d.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.kind} · {d.pageCount} page
                      {d.pageCount === 1 ? "" : "s"} · {d.conceptCount} concepts ·{" "}
                      {formatShortDate(d.createdAt)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready")
    return (
      <Badge variant="outline">
        <CheckCircle2 /> Ready
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge variant="destructive">
        <AlertTriangle /> Failed
      </Badge>
    );
  return (
    <Badge variant="outline">
      <Loader2 className="animate-spin" /> Processing
    </Badge>
  );
}
