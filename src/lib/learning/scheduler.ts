import { PriorityQueue } from "@/lib/dsa/priority-queue";
import { retrievability } from "./sm2";

export interface SchedulableCard {
  id: string;
  dueAt: Date;
  intervalDays: number;
  lastReviewedAt: Date | null;
  easiness: number;
  importance?: number; // 0..1 from the knowledge node (exam likelihood)
}

export interface ScheduledCard extends SchedulableCard {
  urgency: number;
  isDue: boolean;
}

/**
 * Order cards for a study session using a priority queue.
 *
 * Urgency blends three signals (lower priority value = studied sooner):
 *   - overdue-ness: how far past `dueAt` the card is
 *   - forgetting risk: 1 - retrievability (memory likely decayed)
 *   - exam importance: concepts the professor is likely to test
 *
 * This implements the "detect weak areas and dynamically reprioritize" goal.
 */
export function scheduleSession(
  cards: SchedulableCard[],
  opts: { limit?: number; now?: Date } = {}
): ScheduledCard[] {
  const now = opts.now ?? new Date();
  const pq = new PriorityQueue<ScheduledCard>();

  for (const card of cards) {
    const overdueDays = (now.getTime() - card.dueAt.getTime()) / 86_400_000;
    const isDue = overdueDays >= 0;
    const r = retrievability(card.intervalDays, card.lastReviewedAt, now);
    const forgetting = 1 - r;
    const importance = card.importance ?? 0.5;

    // Higher urgency -> lower priority number (dequeued first).
    const urgency =
      Math.max(0, overdueDays) * 0.5 + forgetting * 1.2 + importance * 0.8;

    // Not-yet-due cards are de-prioritized but still schedulable when needed.
    const priority = isDue ? -urgency : 100 - urgency;

    pq.push({ ...card, urgency, isDue }, priority);
  }

  const ordered = pq.toSortedArray();
  return opts.limit ? ordered.slice(0, opts.limit) : ordered;
}
