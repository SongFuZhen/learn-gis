/**
 * SM-2 简化版间隔重复。
 * 与经典 SM-2 的差异：质量分只用「对/错」两档（答对 q=4，答错 q=2），
 * 因为本应用不采集用户自评难度；其余公式保持一致。
 */

export type CardState = {
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
};

export const INITIAL_CARD: CardState = {
  ease: 2.5,
  intervalDays: 0,
  reps: 0,
  lapses: 0,
};

const MIN_EASE = 1.3;

export type ScheduledCard = CardState & { dueInDays: number };

export function schedule(card: CardState, correct: boolean): ScheduledCard {
  const quality = correct ? 4 : 2;

  const ease = Math.max(
    MIN_EASE,
    card.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  if (!correct) {
    return {
      ease,
      intervalDays: 1,
      reps: 0,
      lapses: card.lapses + 1,
      dueInDays: 1,
    };
  }

  const reps = card.reps + 1;
  const intervalDays =
    reps === 1 ? 1 : reps === 2 ? 6 : Math.round(card.intervalDays * ease);

  return {
    ease,
    intervalDays,
    reps,
    lapses: card.lapses,
    dueInDays: intervalDays,
  };
}

/** 判断卡片是否到期（dueAt 为空视为到期） */
export function isDue(dueAt: Date | string | null, now: Date = new Date()): boolean {
  if (!dueAt) return true;
  const date = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() <= now.getTime();
}
