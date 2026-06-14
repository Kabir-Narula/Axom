import type { Difficulty } from "@/lib/validation";

const ORDER: Difficulty[] = ["easy", "medium", "hard", "exam", "trick"];

export interface PerformanceSignal {
  accuracy: number; // 0..1 recent correctness
  avgConfidence: number; // 1..5
  sampleSize: number;
}

export interface AdaptiveDecision {
  difficulty: Difficulty;
  rationale: string;
  overconfident: boolean; // illusion-of-knowing detector
}

/**
 * Strategy that picks the next difficulty from recent performance.
 *
 * Core idea: keep the learner in the "desirable difficulty" zone (~70–85%).
 * Too easy → step up; too hard → step down. Also flags the "illusion of
 * knowing": high confidence paired with low accuracy.
 */
export function recommendDifficulty(
  current: Difficulty,
  signal: PerformanceSignal
): AdaptiveDecision {
  const idx = ORDER.indexOf(current);
  const { accuracy, avgConfidence, sampleSize } = signal;

  // Confidence is 1..5; normalize to 0..1 to compare with accuracy.
  const normConfidence = (avgConfidence - 1) / 4;
  const overconfident = sampleSize >= 3 && normConfidence - accuracy > 0.3;

  if (sampleSize < 3) {
    return {
      difficulty: current,
      rationale: "Calibrating — keeping difficulty steady until we have signal.",
      overconfident,
    };
  }

  let nextIdx = idx;
  let rationale: string;

  if (overconfident) {
    nextIdx = Math.min(ORDER.length - 1, idx + 1);
    rationale =
      "You felt confident but missed questions — the illusion of knowing. Stepping up to expose the gaps.";
  } else if (accuracy >= 0.85) {
    nextIdx = Math.min(ORDER.length - 1, idx + 1);
    rationale = "Strong accuracy — increasing depth and abstraction.";
  } else if (accuracy < 0.55) {
    nextIdx = Math.max(0, idx - 1);
    rationale = "Struggling here — easing off to rebuild the foundation first.";
  } else {
    rationale = "You're in the productive struggle zone — holding difficulty.";
  }

  return { difficulty: ORDER[nextIdx], rationale, overconfident };
}
