import { redirect } from "next/navigation";
import Link from "next/link";
import { Layers, BookOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getDueSession } from "@/lib/services/review-service";
import { PageHeader } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ReviewSession } from "@/components/review/review-session";

export const metadata = { title: "Review — Axom" };

export default async function ReviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const cards = await getDueSession(user.id, 30);

  return (
    <div>
      <PageHeader
        eyebrow="Spaced repetition"
        title="Review session"
        description="These cards are scheduled by the SM-2 algorithm — prioritized by what you're about to forget and what matters most for your exams."
      />

      {cards.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" />}
          title="Nothing due right now"
          description="You're all caught up. New cards appear here as their review time arrives. Upload more material or take a practice test to grow your deck."
          action={
            <Link href="/courses">
              <Button variant="secondary">
                <BookOpen className="h-4 w-4" /> Go to courses
              </Button>
            </Link>
          }
        />
      ) : (
        <ReviewSession
          cards={cards.map((c) => ({
            id: c.id,
            front: c.front,
            back: c.back,
            kind: c.kind,
            courseId: c.courseId,
            courseTitle: c.courseTitle,
            courseColor: c.courseColor,
            conceptLabel: c.conceptLabel,
          }))}
        />
      )}
    </div>
  );
}
