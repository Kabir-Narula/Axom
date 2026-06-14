import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Network,
  Layers,
  Flame,
  ArrowRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { courseRepo } from "@/lib/repositories/courses";
import { cardRepo } from "@/lib/repositories/cards";
import { reviewRepo } from "@/lib/repositories/reviews";
import { PageHeader, StatCard, SectionTitle } from "@/components/ui/page";
import { CountUp } from "@/components/ui/count-up";
import { EmptyState } from "@/components/ui/misc";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateCourse } from "@/components/create-course";
import { relativeDays } from "@/lib/utils";

export const metadata = { title: "Dashboard — Axom" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line react-hooks/purity
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [courses, dueCount, reviewsThisWeek] = await Promise.all([
    courseRepo.listByUser(user.id),
    cardRepo.countDueForUser(user.id),
    reviewRepo.countByUserSince(user.id, weekAgo),
  ]);

  const totalConcepts = courses.reduce((s, c) => s + c._count.knowledgeNodes, 0);
  const firstName = user.name.split(" ")[0];

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${firstName}`}
        description="Your study cockpit. Pick up where you left off, or feed Axom new material."
        actions={<CreateCourse />}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Courses"
          value={<CountUp value={courses.length} />}
          icon={<BookOpen className="size-4" strokeWidth={1.75} />}
        />
        <StatCard
          label="Concepts mapped"
          value={<CountUp value={totalConcepts} />}
          icon={<Network className="size-4" strokeWidth={1.75} />}
        />
        <StatCard
          label="Cards due"
          value={<CountUp value={dueCount} />}
          hint={dueCount > 0 ? "Review to retain them" : "All caught up"}
          icon={<Layers className="size-4" strokeWidth={1.75} />}
        />
        <StatCard
          label="Reviews this week"
          value={<CountUp value={reviewsThisWeek} />}
          icon={<Flame className="size-4" strokeWidth={1.75} />}
        />
      </div>

      {dueCount > 0 && (
        <Link href="/review" className="mb-10 block">
          <div className="group flex items-center justify-between rounded-lg border border-border bg-card p-5 transition-colors hover:border-[#3f3f46]">
            <div className="flex items-center gap-4">
              <span className="flex size-9 items-center justify-center rounded-md border border-border bg-muted">
                <Layers className="size-4 text-muted-foreground" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {dueCount} card{dueCount === 1 ? "" : "s"} ready for review
                </p>
                <p className="text-sm text-muted-foreground">
                  Spaced repetition works best right on time.
                </p>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      )}

      <SectionTitle>Your courses</SectionTitle>
      {courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-5" strokeWidth={1.5} />}
          title="No courses yet"
          description="Create your first course, then upload slides or notes. Axom will map the concepts and build your study system automatically."
          action={<CreateCourse />}
        />
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <StaggerItem key={c.id}>
              <Link href={`/courses/${c.id}`}>
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
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <div className="mt-12">
        <SectionTitle>Quick actions</SectionTitle>
        <div className="flex flex-wrap gap-3">
          <Link href="/review">
            <Button variant="secondary">
              <Layers /> Review due cards
            </Button>
          </Link>
          <CreateCourse variant="secondary" />
        </div>
      </div>
    </div>
  );
}
