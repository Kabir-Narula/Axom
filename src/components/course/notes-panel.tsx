"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, ApiClientError } from "@/lib/client";
import { NOTE_STYLES, type NoteStyle } from "@/lib/validation";
import { cn, formatShortDate } from "@/lib/utils";
import type { NoteListItem } from "./types";

const STYLE_INFO: Record<NoteStyle, { label: string; desc: string }> = {
  cornell: { label: "Cornell", desc: "Cues, notes & summary" },
  exam: { label: "Exam-focused", desc: "High-yield, by difficulty" },
  eli5: { label: "ELI5", desc: "Simplest possible" },
  mindmap: { label: "Mind map", desc: "Nested structure" },
  formal: { label: "Formal", desc: "Textbook style" },
  analogy: { label: "Analogy", desc: "Learn by comparison" },
};

export function NotesPanel({
  courseId,
  notes,
  hasConcepts,
}: {
  courseId: string;
  notes: NoteListItem[];
  hasConcepts: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [style, setStyle] = useState<NoteStyle>("cornell");
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const note = await api<{ id: string }>("/api/notes", {
        method: "POST",
        body: { courseId, style },
      });
      toast("Notes generated.", "success");
      router.push(`/courses/${courseId}/notes/${note.id}`);
      router.refresh();
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : "Failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Generate notes
        </h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Pick a style — Axom writes notes from this course&apos;s concepts.
        </p>
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {NOTE_STYLES.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={cn(
                "rounded-md border p-3 text-left transition-colors",
                style === s
                  ? "border-[#3f3f46] bg-secondary"
                  : "border-border hover:border-[#3f3f46]"
              )}
            >
              <p className="text-sm font-medium text-foreground">
                {STYLE_INFO[s].label}
              </p>
              <p className="text-xs text-muted-foreground">
                {STYLE_INFO[s].desc}
              </p>
            </button>
          ))}
        </div>
        <Button onClick={generate} loading={busy} disabled={!hasConcepts}>
          Generate {STYLE_INFO[style].label} notes
        </Button>
        {!hasConcepts && (
          <p className="mt-2 text-xs text-muted-foreground">
            Upload material first — there are no concepts to summarise yet.
          </p>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Saved notes ({notes.length})
        </h3>
        {notes.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" strokeWidth={1.5} />}
            title="No notes yet"
            description="Generate your first set of notes above."
          />
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <Link key={n.id} href={`/courses/${courseId}/notes/${n.id}`}>
                <div className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-[#3f3f46]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(n.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{n.style}</Badge>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
