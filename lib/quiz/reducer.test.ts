import { describe, expect, it } from "vitest";
import {
  createSession,
  currentQuestion,
  sessionReducer,
  summarize,
} from "./reducer";
import type { ChoiceQuestion } from "./types";

function q(id: string): ChoiceQuestion {
  return {
    id,
    skill: "gis",
    module: "01",
    type: "single",
    difficulty: 1,
    stem: `题目 ${id}`,
    options: [
      { key: "A", text: "A" },
      { key: "B", text: "B" },
    ],
    answer: ["A"],
    explanation: "解析",
    refs: [{ title: "ref", url: "https://epsg.io/4326" }],
  };
}

const questions = [q("gis-01-001"), q("gis-01-002"), q("gis-01-003")];

describe("sessionReducer", () => {
  it("初始为 answering 且指向第一题", () => {
    const state = createSession(questions);
    expect(state.phase).toBe("answering");
    expect(currentQuestion(state).id).toBe("gis-01-001");
  });

  it("submit 记录答案并进入 revealed", () => {
    let state = createSession(questions);
    state = sessionReducer(state, {
      type: "submit",
      response: { kind: "choice", selected: ["A"] },
    });
    expect(state.phase).toBe("revealed");
    expect(state.records).toHaveLength(1);
    expect(state.records[0]?.correct).toBe(true);
  });

  it("重复 submit 被忽略（不重复计分）", () => {
    let state = createSession(questions);
    const action = {
      type: "submit" as const,
      response: { kind: "choice" as const, selected: ["B"] },
    };
    state = sessionReducer(state, action);
    const again = sessionReducer(state, action);
    expect(again.records).toHaveLength(1);
    expect(again).toBe(state);
  });

  it("answering 阶段 next 被忽略", () => {
    const state = createSession(questions);
    expect(sessionReducer(state, { type: "next" })).toBe(state);
  });

  it("revealed → next 前进一题并回到 answering", () => {
    let state = createSession(questions);
    state = sessionReducer(state, {
      type: "submit",
      response: { kind: "choice", selected: ["A"] },
    });
    state = sessionReducer(state, { type: "next" });
    expect(state.index).toBe(1);
    expect(state.phase).toBe("answering");
  });

  it("最后一题后 next 进入 finished", () => {
    let state = createSession(questions.slice(0, 1));
    state = sessionReducer(state, {
      type: "submit",
      response: { kind: "choice", selected: ["A"] },
    });
    state = sessionReducer(state, { type: "next" });
    expect(state.phase).toBe("finished");
  });

  it("restart 清空记录回到第一题", () => {
    let state = createSession(questions);
    state = sessionReducer(state, {
      type: "submit",
      response: { kind: "choice", selected: ["B"] },
    });
    state = sessionReducer(state, { type: "next" });
    state = sessionReducer(state, { type: "restart" });
    expect(state.index).toBe(0);
    expect(state.phase).toBe("answering");
    expect(state.records).toHaveLength(0);
  });

  it("空题库直接抛错（避免空会话渲染）", () => {
    expect(() => createSession([])).toThrow();
  });

  it("skip 记录为跳过并进入 revealed（不判卷）", () => {
    let state = createSession(questions);
    state = sessionReducer(state, { type: "skip" });
    expect(state.phase).toBe("revealed");
    expect(state.records).toHaveLength(1);
    expect(state.records[0]).toMatchObject({
      questionId: "gis-01-001",
      response: null,
      correct: false,
      skipped: true,
    });
  });

  it("revealed 阶段重复 skip 被忽略", () => {
    let state = createSession(questions);
    state = sessionReducer(state, { type: "skip" });
    const again = sessionReducer(state, { type: "skip" });
    expect(again).toBe(state);
    expect(again.records).toHaveLength(1);
  });
});

describe("summarize", () => {
  it("统计正确率与错题 id", () => {
    let state = createSession(questions);
    state = sessionReducer(state, {
      type: "submit",
      response: { kind: "choice", selected: ["A"] },
    });
    state = sessionReducer(state, { type: "next" });
    state = sessionReducer(state, {
      type: "submit",
      response: { kind: "choice", selected: ["B"] },
    });
    state = sessionReducer(state, { type: "next" });

    const result = summarize(state);
    expect(result.answered).toBe(2);
    expect(result.correct).toBe(1);
    expect(result.accuracy).toBe(0.5);
    expect(result.mastery).toBe(50);
    expect(result.wrongIds).toEqual(["gis-01-002"]);
    expect(result.total).toBe(3);
  });

  it("未作答时正确率为 0", () => {
    expect(summarize(createSession(questions)).accuracy).toBe(0);
  });

  it("跳过题计入 wrongIds 与 skipped，但不进正确率分母", () => {
    let state = createSession(questions);
    // 第 1 题答对
    state = sessionReducer(state, {
      type: "submit",
      response: { kind: "choice", selected: ["A"] },
    });
    state = sessionReducer(state, { type: "next" });
    // 第 2 题跳过
    state = sessionReducer(state, { type: "skip" });
    state = sessionReducer(state, { type: "next" });

    const result = summarize(state);
    expect(result.answered).toBe(2);
    expect(result.correct).toBe(1);
    expect(result.skipped).toBe(1);
    // 分母只含实际作答的 1 题 → 100%，而非 1/2
    expect(result.accuracy).toBe(1);
    expect(result.mastery).toBe(100);
    expect(result.wrongIds).toEqual(["gis-01-002"]);
  });

  it("全部跳过时正确率为 0", () => {
    let state = createSession(questions.slice(0, 1));
    state = sessionReducer(state, { type: "skip" });
    const result = summarize(state);
    expect(result.skipped).toBe(1);
    expect(result.accuracy).toBe(0);
    expect(result.mastery).toBe(0);
    expect(result.wrongIds).toEqual(["gis-01-001"]);
  });
});
