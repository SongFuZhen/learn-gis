import { describe, expect, it } from "vitest";
import { INITIAL_CARD, isDue, schedule } from "./schedule";

describe("schedule（SM-2 简化版）", () => {
  it("首次答对：间隔 1 天", () => {
    const next = schedule(INITIAL_CARD, true);
    expect(next.reps).toBe(1);
    expect(next.intervalDays).toBe(1);
    expect(next.dueInDays).toBe(1);
    expect(next.ease).toBeCloseTo(2.5);
  });

  it("连续答对：1 → 6 → 按 ease 增长", () => {
    const first = schedule(INITIAL_CARD, true);
    const second = schedule(first, true);
    expect(second.intervalDays).toBe(6);

    const third = schedule(second, true);
    expect(third.intervalDays).toBe(Math.round(6 * second.ease));
    expect(third.intervalDays).toBeGreaterThan(6);
  });

  it("答错：重置进度、间隔 1 天、lapses+1", () => {
    const next = schedule({ ...INITIAL_CARD, reps: 3, intervalDays: 20 }, false);
    expect(next.reps).toBe(0);
    expect(next.intervalDays).toBe(1);
    expect(next.lapses).toBe(1);
  });

  it("ease 有 1.3 下限", () => {
    const low = { ease: 1.3, intervalDays: 5, reps: 2, lapses: 0 };
    const next = schedule(low, false);
    expect(next.ease).toBe(1.3);
  });

  it("多次答错后 ease 持续下降但不低于下限", () => {
    let card = INITIAL_CARD;
    for (let i = 0; i < 10; i += 1) {
      card = schedule(card, false);
    }
    expect(card.ease).toBeGreaterThanOrEqual(1.3);
    expect(card.lapses).toBe(10);
  });
});

describe("isDue", () => {
  const now = new Date("2025-10-21T12:00:00Z");

  it("无到期时间视为到期", () => {
    expect(isDue(null, now)).toBe(true);
  });

  it("过去时间到期", () => {
    expect(isDue("2025-10-20T12:00:00Z", now)).toBe(true);
  });

  it("未来时间未到期", () => {
    expect(isDue(new Date("2025-10-22T12:00:00Z"), now)).toBe(false);
  });

  it("非法时间按到期处理（宁可多复习一次）", () => {
    expect(isDue("not-a-date", now)).toBe(true);
  });
});
