import { describe, expect, it } from "vitest";
import { ALL_QUESTIONS } from "@/content/gis/all-questions";
import {
  EXAM_PLAN,
  dateKey,
  dailySeed,
  mulberry32,
  pickExamQuestions,
} from "@/lib/quiz/exam";

const modulesOf = (questions: { module: string }[]) =>
  new Set(questions.map((q) => q.module));

describe("pickExamQuestions", () => {
  it("按题量抽题且不重复", () => {
    const picked = pickExamQuestions(ALL_QUESTIONS, 25, mulberry32(123));
    expect(picked).toHaveLength(25);
    expect(new Set(picked.map((q) => q.id)).size).toBe(25);
  });

  it("每日一考：同一种子结果完全一致（同一天同一套卷）", () => {
    const a = pickExamQuestions(ALL_QUESTIONS, 10, mulberry32(dailySeed("2026-02-01")));
    const b = pickExamQuestions(ALL_QUESTIONS, 10, mulberry32(dailySeed("2026-02-01")));
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
  });

  it("每日一考：跨章节覆盖（题量够时每章至少一题）", () => {
    const picked = pickExamQuestions(ALL_QUESTIONS, 10, mulberry32(dailySeed("2026-02-01")));
    expect(picked).toHaveLength(10);
    expect(modulesOf(picked)).toHaveLength(modulesOf(ALL_QUESTIONS).size);
  });

  it("每日一考：换一天就换卷", () => {
    const day1 = pickExamQuestions(ALL_QUESTIONS, 10, mulberry32(dailySeed("2026-02-01")));
    const day2 = pickExamQuestions(ALL_QUESTIONS, 10, mulberry32(dailySeed("2026-02-02")));
    expect(day1.map((q) => q.id)).not.toEqual(day2.map((q) => q.id));
  });

  it("综合考试：跨章随机，章数不至于只有一两章", () => {
    const picked = pickExamQuestions(ALL_QUESTIONS, EXAM_PLAN.mock.size, mulberry32(7));
    expect(modulesOf(picked).size).toBeGreaterThanOrEqual(5);
  });

  it("题量超过题库时返回全部去重后的题", () => {
    const picked = pickExamQuestions(ALL_QUESTIONS, 999, mulberry32(1));
    expect(picked).toHaveLength(ALL_QUESTIONS.length);
    expect(new Set(picked.map((q) => q.id)).size).toBe(ALL_QUESTIONS.length);
  });

  it("count <= 0 返回空数组", () => {
    expect(pickExamQuestions(ALL_QUESTIONS, 0, mulberry32(1))).toEqual([]);
  });

  it("源数据有重复 id 时结果仍然唯一", () => {
    const dup = [...ALL_QUESTIONS.slice(0, 3), ...ALL_QUESTIONS.slice(0, 3)];
    const picked = pickExamQuestions(dup, 99, mulberry32(1));
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((q) => q.id)).size).toBe(3);
  });
});

describe("dateKey / dailySeed", () => {
  it("用本地时区生成 YYYY-MM-DD", () => {
    expect(dateKey(new Date(2026, 1, 1, 23, 59))).toBe("2026-02-01");
    expect(dateKey(new Date(2026, 0, 9, 0, 1))).toBe("2026-01-09");
  });

  it("种子是稳定的 32 位无符号整数，且随日期变化", () => {
    const a = dailySeed("2026-02-01");
    expect(a).toBe(dailySeed("2026-02-01"));
    expect(Number.isInteger(a) && a >= 0 && a <= 0xffffffff).toBe(true);
    expect(a).not.toBe(dailySeed("2026-02-02"));
  });
});
