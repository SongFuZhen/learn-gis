import { describe, expect, it } from "vitest";
import { findConflict } from "./conflict";

const existing = [
  { id: "a", kind: "note" as const, anchor: { start: 10, end: 20 } },
  { id: "b", kind: "record" as const, anchor: { start: 30, end: 40 } },
];

describe("findConflict", () => {
  it("同区间同类型 → duplicate", () => {
    expect(findConflict(existing, { start: 10, end: 20 }, "note")).toEqual({
      id: "a",
      reason: "duplicate",
    });
  });

  it("同区间不同类型 → overlap（不允许同段重复划线）", () => {
    expect(findConflict(existing, { start: 10, end: 20 }, "question")).toEqual({
      id: "a",
      reason: "overlap",
    });
  });

  it("部分相交（嵌套/交叉）→ overlap", () => {
    expect(findConflict(existing, { start: 15, end: 25 }, "note")).toEqual({
      id: "a",
      reason: "overlap",
    });
    expect(findConflict(existing, { start: 5, end: 12 }, "note")).toEqual({
      id: "a",
      reason: "overlap",
    });
  });

  it("首尾相接不相交 → null", () => {
    expect(findConflict(existing, { start: 20, end: 28 }, "note")).toBeNull();
    expect(findConflict(existing, { start: 0, end: 10 }, "note")).toBeNull();
  });

  it("完全不相交 → null", () => {
    expect(findConflict(existing, { start: 50, end: 60 }, "note")).toBeNull();
  });

  it("空列表 → null", () => {
    expect(findConflict([], { start: 0, end: 5 }, "note")).toBeNull();
  });
});
