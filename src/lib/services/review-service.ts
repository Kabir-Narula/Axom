import { cardRepo } from "@/lib/repositories/cards";
import { reviewRepo } from "@/lib/repositories/reviews";
import { knowledgeRepo } from "@/lib/repositories/knowledge";
import { scheduleSession } from "@/lib/learning/scheduler";
import { sm2 } from "@/lib/learning/sm2";
import { ApiError } from "@/lib/api";

export interface ReviewCardView {
  id: string;
  front: string;
  back: string;
  kind: string;
  courseId: string;
  courseTitle: string;
  courseColor: string;
  conceptLabel: string | null;
  urgency: number;
}

/** Build a prioritized review session across all of a user's due cards. */
export async function getDueSession(
  userId: string,
  limit = 20
): Promise<ReviewCardView[]> {
  const due = await cardRepo.listDueForUser(userId);
  const scheduled = scheduleSession(
    due.map((c) => ({
      id: c.id,
      dueAt: c.dueAt,
      intervalDays: c.intervalDays,
      lastReviewedAt: c.lastReviewedAt,
      easiness: c.easiness,
      importance: c.node?.importance ?? 0.5,
    })),
    { limit }
  );

  const byId = new Map(due.map((c) => [c.id, c]));
  return scheduled.map((s) => {
    const card = byId.get(s.id)!;
    return {
      id: card.id,
      front: card.front,
      back: card.back,
      kind: card.kind,
      courseId: card.course.id,
      courseTitle: card.course.title,
      courseColor: card.course.color,
      conceptLabel: card.node?.label ?? null,
      urgency: s.urgency,
    };
  });
}

/** Apply an SM-2 grade to a card and propagate mastery to its concept. */
export async function gradeCard(input: {
  userId: string;
  cardId: string;
  grade: number;
}) {
  const card = await cardRepo.findForUser(input.cardId, input.userId);
  if (!card) throw new ApiError(404, "Card not found.");

  const prevInterval = card.intervalDays;
  const result = sm2(
    {
      easiness: card.easiness,
      repetitions: card.repetitions,
      intervalDays: card.intervalDays,
      lapses: card.lapses,
    },
    input.grade
  );

  await cardRepo.applySchedule(card.id, result);
  await reviewRepo.create({
    cardId: card.id,
    userId: input.userId,
    grade: input.grade,
    prevInterval,
    nextInterval: result.intervalDays,
  });

  if (card.nodeId) {
    // Map grade (0..5) to a mastery delta.
    const delta = (input.grade - 2.5) / 25; // -0.1 .. +0.1
    await knowledgeRepo.adjustMastery(card.nodeId, delta);
  }

  return {
    nextDueAt: result.dueAt,
    intervalDays: result.intervalDays,
  };
}
