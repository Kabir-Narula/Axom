/**
 * SuperMemo SM-2 spaced-repetition algorithm.
 *
 * Given the current scheduling state of a card and a recall `grade` (0..5),
 * returns the next state: updated easiness factor, repetition count, interval
 * (in days) and the next due date.
 *
 * Reference: Wozniak, SM-2 (1987). Grades:
 *   5 perfect · 4 correct (hesitation) · 3 correct (difficult)
 *   2 wrong (familiar) · 1 wrong (recognized) · 0 blackout
 */
export interface Sm2State {
  easiness: number; // EF, >= 1.3
  repetitions: number;
  intervalDays: number;
  lapses: number;
}

export interface Sm2Result extends Sm2State {
  dueAt: Date;
}

const MIN_EF = 1.3;
const DAY_MS = 86_400_000;

export function sm2(state: Sm2State, grade: number, now = new Date()): Sm2Result {
  const q = Math.max(0, Math.min(5, Math.round(grade)));

  let { easiness, repetitions, intervalDays, lapses } = state;

  // Update easiness factor (applied for every grade per SM-2).
  easiness = easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easiness < MIN_EF) easiness = MIN_EF;

  if (q < 3) {
    // Failed recall: reset repetitions, short relearn interval.
    repetitions = 0;
    intervalDays = q === 2 ? 0.5 : 10 / (60 * 24); // 12h or 10min for blackout
    lapses += 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easiness);
  }

  const dueAt = new Date(now.getTime() + intervalDays * DAY_MS);
  return { easiness, repetitions, intervalDays, lapses, dueAt };
}

/**
 * Map a card's state to a "retrievability" estimate (0..1): how likely the
 * learner still remembers it right now. Drives mastery and urgency scoring.
 */
export function retrievability(
  intervalDays: number,
  lastReviewedAt: Date | null,
  now = new Date()
): number {
  if (!lastReviewedAt || intervalDays <= 0) return 0;
  const elapsedDays = (now.getTime() - lastReviewedAt.getTime()) / DAY_MS;
  // Exponential forgetting curve with stability = interval.
  return Math.exp(-elapsedDays / Math.max(intervalDays, 0.1));
}
