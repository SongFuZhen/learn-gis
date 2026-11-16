import { describe, expect, it } from "vitest";
import { activityLevel } from "@/lib/engagement/activity";

const zero = {
  answerCount: 0,
  examCount: 0,
  lessonCount: 0,
};

describe("activityLevel", () => {
  it("未打卡一律 0，即便有活动量也不亮日历格", () => {
    expect(
      activityLevel({ ...zero, checkedIn: false, answerCount: 99 }),
    ).toBe(0);
  });

  it("打卡但零活动回落最低档 1", () => {
    expect(activityLevel({ ...zero, checkedIn: true })).toBe(1);
  });

  it("加权分阈值边界：1-4→1，5-14→2，15-34→3，≥35→4", () => {
    const cases: Array<[number, ReturnType<typeof activityLevel>]> = [
      [1, 1],
      [4, 1],
      [5, 2],
      [14, 2],
      [15, 3],
      [34, 3],
      [35, 4],
      [100, 4],
    ];
    for (const [score, expected] of cases) {
      expect(
        activityLevel({ ...zero, checkedIn: true, answerCount: score }),
      ).toBe(expected);
    }
  });

  it("考试与讲义按权重计分：1 场考试=5 分，1 章讲义=3 分", () => {
    // 1 考试(5) + 0 答题 → 档 2
    expect(
      activityLevel({ ...zero, checkedIn: true, examCount: 1 }),
    ).toBe(2);
    // 2 讲义(6) + 0 答题 → 档 2
    expect(
      activityLevel({ ...zero, checkedIn: true, lessonCount: 2 }),
    ).toBe(2);
    // 5 考试(25) + 3 讲义(9) + 1 答题 = 35 → 档 4
    expect(
      activityLevel({
        checkedIn: true,
        answerCount: 1,
        examCount: 5,
        lessonCount: 3,
      }),
    ).toBe(4);
  });
});
