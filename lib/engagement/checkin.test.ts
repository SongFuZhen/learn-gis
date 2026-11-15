import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dateKey } from "@/lib/quiz/exam";
import { getStreak } from "@/lib/engagement/checkin";

/** 相对今天生成 YYYY-MM-DD，delta 为负表示过去几天 */
function dayAgo(delta: number): string {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return dateKey(d);
}

describe("getStreak", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 15, 10, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("空集合返回全零", () => {
    expect(getStreak([])).toEqual({ current: 0, longest: 0 });
  });

  it("只有今天一行：current/longest 均为 1", () => {
    expect(getStreak([dayAgo(0)])).toEqual({ current: 1, longest: 1 });
  });

  it("连续三天含今天：current=3，longest=3", () => {
    const keys = [dayAgo(0), dayAgo(-1), dayAgo(-2)];
    expect(getStreak(keys)).toEqual({ current: 3, longest: 3 });
  });

  it("今天没签但昨天连签三天：不断签，current 从昨天起算", () => {
    const keys = [dayAgo(-1), dayAgo(-2), dayAgo(-3)];
    expect(getStreak(keys)).toEqual({ current: 3, longest: 3 });
  });

  it("中间断一天：current 归零，longest 保留历史最长段", () => {
    // 历史连签 4 天，之后断档，最近只在昨天签了 1 天
    const keys = [
      dayAgo(-10),
      dayAgo(-9),
      dayAgo(-8),
      dayAgo(-7),
      dayAgo(-1),
    ];
    expect(getStreak(keys)).toEqual({ current: 1, longest: 4 });
  });

  it("跨月连续：10/31 → 11/1 → 11/2 视为连续", () => {
    vi.setSystemTime(new Date(2026, 10, 2, 10, 0, 0));
    const keys = ["2026-10-31", "2026-11-01", "2026-11-02"];
    expect(getStreak(keys)).toEqual({ current: 3, longest: 3 });
  });

  it("重复日期去重后计算", () => {
    const keys = [dayAgo(0), dayAgo(0), dayAgo(-1), dayAgo(-1)];
    expect(getStreak(keys)).toEqual({ current: 2, longest: 2 });
  });
});
