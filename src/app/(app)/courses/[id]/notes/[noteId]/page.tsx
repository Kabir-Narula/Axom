import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { noteRepo } from "@/lib/repositories/notes";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/markdown";
import { formatShortDate } from "@/lib/utils";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string; noteId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id, noteId } = await params;

  const note = await noteRepo.findForUser(noteId, user.id);
  if (!note || note.courseId !== id) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/courses/${id}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Back to course
      </Link>

      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {note.title}
        </h1>
        <Badge variant="outline">{note.style}</Badge>
      </div>
      <p className="mb-8 text-xs text-muted-foreground">
        Generated {formatShortDate(note.createdAt)}
      </p>

      <article className="rounded-lg border border-border bg-card p-6 sm:p-8">
        <Markdown source={note.contentMd} />
      </article>
    </div>
  );
}
