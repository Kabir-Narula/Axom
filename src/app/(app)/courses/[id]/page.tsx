import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { courseRepo } from "@/lib/repositories/courses";
import { documentRepo } from "@/lib/repositories/documents";
import { knowledgeRepo } from "@/lib/repositories/knowledge";
import { noteRepo } from "@/lib/repositories/notes";
import { quizRepo } from "@/lib/repositories/quizzes";
import { planRepo } from "@/lib/repositories/plans";
import { CourseWorkspace } from "@/components/course/course-workspace";
import { relativeDays } from "@/lib/utils";

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const { tab, q } = await searchParams;

  const course = await courseRepo.detailForUser(id, user.id);
  if (!course) notFound();

  const [documents, nodes, notes, quizzes, plan] = await Promise.all([
    documentRepo.listByCourse(id, user.id),
    knowledgeRepo.listByCourse(id),
    noteRepo.listByCourse(id),
    quizRepo.listByCourse(id),
    planRepo.findByCourse(id, user.id),
  ]);

  return (
    <div>
      <Link
        href="/courses"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> All courses
      </Link>

      <div className="mb-9 flex flex-wrap items-center gap-3.5">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: course.color }}
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
            {course.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {course.code && <span>{course.code}</span>}
            {course.examDate && (
              <>
                {course.code && <span className="text-border">·</span>}
                <span>Exam {relativeDays(course.examDate)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <CourseWorkspace
        course={{
          id: course.id,
          title: course.title,
          code: course.code,
          color: course.color,
          examDate: course.examDate ? course.examDate.toISOString() : null,
          counts: course._count,
        }}
        documents={documents.map((d) => ({
          id: d.id,
          title: d.title,
          kind: d.kind,
          status: d.status,
          pageCount: d.pageCount,
          sizeBytes: d.sizeBytes,
          createdAt: d.createdAt.toISOString(),
          conceptCount: d._count.knowledgeNodes,
        }))}
        concepts={nodes.map((n) => ({
          id: n.id,
          label: n.label,
          summary: n.summary,
          keyTerms: n.keyTerms,
          importance: n.importance,
          difficulty: n.difficulty,
          mastery: n.mastery,
          sourceRef: n.sourceRef,
        }))}
        notes={notes.map((n) => ({
          id: n.id,
          title: n.title,
          style: n.style,
          createdAt: n.createdAt.toISOString(),
        }))}
        quizzes={quizzes.map((q) => ({
          id: q.id,
          title: q.title,
          difficulty: q.difficulty,
          mode: q.mode,
          createdAt: q.createdAt.toISOString(),
          completedAt: q.completedAt ? q.completedAt.toISOString() : null,
          scorePct: q.scorePct,
          questionCount: q._count.questions,
        }))}
        plan={
          plan
            ? {
                id: plan.id,
                examDate: plan.examDate.toISOString(),
                dailyMinutes: plan.dailyMinutes,
                tasks: plan.tasks.map((t) => ({
                  id: t.id,
                  date: t.date.toISOString(),
                  kind: t.kind,
                  title: t.title,
                  durationMin: t.durationMin,
                  status: t.status,
                })),
              }
            : null
        }
        initialTab={tab}
        initialResourceQuery={q}
      />
    </div>
  );
}
