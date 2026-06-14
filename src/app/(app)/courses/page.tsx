import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { courseRepo } from "@/lib/repositories/courses";
import { PageHeader } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { CreateCourse } from "@/components/create-course";
import { relativeDays } from "@/lib/utils";

export const metadata = { title: "Courses — Axom" };

export default async function CoursesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const courses = await courseRepo.listByUser(user.id);

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Courses"
        description="Each course is its own knowledge graph, card deck and exam engine."
        actions={<CreateCourse />}
      />

      {courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-5" strokeWidth={1.5} />}
          title="No courses yet"
          description="Create a course to start uploading material and building your study system."
          action={<CreateCourse />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} href={`/courses/${c.id}`}>
              <div className="group h-full rounded-lg border border-border bg-card p-5 transition-colors hover:border-[#3f3f46]">
                <div className="mb-4 flex items-start justify-between">
                  <span
                    className="mt-1 size-2.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.examDate && (
                    <span className="text-xs text-muted-foreground">
                      Exam {relativeDays(c.examDate)}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  {c.title}
                </h3>
                {c.code && (
                  <p className="text-xs text-muted-foreground">{c.code}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Badge variant="outline">{c._count.documents} docs</Badge>
                  <Badge variant="outline">
                    {c._count.knowledgeNodes} concepts
                  </Badge>
                  <Badge variant="outline">{c._count.cards} cards</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
