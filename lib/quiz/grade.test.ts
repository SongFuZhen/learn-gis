import { describe, expect, it } from "vitest";
import { grade, normalizeShortAnswer, wrongPicks } from "./grade";
import type { ChoiceQuestion, ShortQuestion } from "./types";

const single: ChoiceQuestion = {
  id: "gis-01-001",
  skill: "gis",
  module: "01",
  type: "single",
  difficulty: 1,
  stem: "示例单选题干",
  options: [
    { key: "A", text: "选项 A", hint: "A 是错的" },
    { key: "B", text: "选项 B" },
  ],
  answer: ["B"],
  explanation: "因为 B 对",
  refs: [{ title: "ref", url: "https://epsg.io/4326" }],
};

const multi: ChoiceQuestion = {
  ...single,
  id: "gis-01-002",
  type: "multi",
  answer: ["A", "C"],
  options: [
    { key: "A", text: "A" },
    { key: "B", text: "B" },
    { key: "C", text: "C" },
  ],
};

const short: ShortQuestion = {
  id: "gis-01-010",
  skill: "gis",
  module: "01",
  type: "short",
  difficulty: 1,
  stem: "单位是什么",
  accepted: ["度", "degree"],
  explanation: "单位是度",
  refs: [{ title: "ref", url: "https://epsg.io/4326" }],
};

describe("grade / 单选", () => {
  it("选中正确答案", () => {
    expect(grade(single, { kind: "choice", selected: ["B"] }).correct).toBe(true);
  });

  it("选中错误答案，并给出正确 key", () => {
    const result = grade(single, { kind: "choice", selected: ["A"] });
    expect(result.correct).toBe(false);
    expect(result.expected).toEqual(["B"]);
  });

  it("多选了额外项也算错（单选严格）", () => {
    expect(
      grade(single, { kind: "choice", selected: ["A", "B"] }).correct,
    ).toBe(false);
  });

  it("类型不匹配（短答响应给选择题）判错", () => {
    expect(grade(single, { kind: "short", text: "B" }).correct).toBe(false);
  });
});

describe("grade / 多选", () => {
  it("集合相等即正确，与顺序无关", () => {
    expect(
      grade(multi, { kind: "choice", selected: ["C", "A"] }).correct,
    ).toBe(true);
  });

  it("漏选判错", () => {
    expect(grade(multi, { kind: "choice", selected: ["A"] }).correct).toBe(false);
  });

  it("多选判错", () => {
    expect(
      grade(multi, { kind: "choice", selected: ["A", "B", "C"] }).correct,
    ).toBe(false);
  });

  it("重复选中同一 key 不算通过", () => {
    expect(
      grade(multi, { kind: "choice", selected: ["A", "A"] }).correct,
    ).toBe(false);
  });
});

describe("grade / 短答规范化", () => {
  it("忽略首尾空白与大小写", () => {
    expect(
      grade(short, { kind: "short", text: "  Degree " }).correct,
    ).toBe(true);
  });

  it("全角转半角", () => {
    expect(normalizeShortAnswer("ｄｅｇｒｅｅ")).toBe("degree");
  });

  it("内部多余空格被压缩", () => {
    expect(normalizeShortAnswer(" hello   world ")).toBe("hello world");
  });

  it("空回答判错", () => {
    expect(grade(short, { kind: "short", text: "   " }).correct).toBe(false);
  });

  it("中文答案准确命中", () => {
    expect(grade(short, { kind: "short", text: "度" }).correct).toBe(true);
  });
});

describe("wrongPicks", () => {
  it("只返回选中且不属于答案的选项（用于干扰项解释）", () => {
    const picks = wrongPicks(multi, { kind: "choice", selected: ["A", "B"] });
    expect(picks.map((o) => o.key)).toEqual(["B"]);
  });
});
