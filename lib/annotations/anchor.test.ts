import { describe, expect, it } from "vitest";
import {
  buildAnchorFromText,
  CONTEXT_LEN,
  resolveSpan,
} from "./anchor";

const text = "椭球面上的距离用大地线测量，而不是平面直线。";
// 选中「大地线」：下标 11..14
const quote = "大地线";
const start = text.indexOf(quote);
const end = start + quote.length;

describe("buildAnchorFromText", () => {
  it("记录偏移与前后 24 字上下文", () => {
    const anchor = buildAnchorFromText(text, start, end);
    expect(anchor.start).toBe(start);
    expect(anchor.end).toBe(end);
    expect(text.endsWith(anchor.prefix + quote + anchor.suffix)).toBe(true);
    expect(anchor.prefix.length).toBeLessThanOrEqual(CONTEXT_LEN);
    expect(anchor.suffix.length).toBeLessThanOrEqual(CONTEXT_LEN);
  });

  it("靠近开头时 prefix 被截断而不越界", () => {
    const anchor = buildAnchorFromText(text, 0, 3);
    expect(anchor.prefix).toBe("");
    expect(anchor.suffix).toBe(text.slice(3, 3 + CONTEXT_LEN));
  });
});

describe("resolveSpan", () => {
  const anchor = buildAnchorFromText(text, start, end);

  it("偏移仍命中原文时直接返回原区间", () => {
    expect(resolveSpan(text, anchor, quote)).toEqual({ start, end });
  });

  it("讲义在前面插入文字导致偏移漂移时，用上下文兜底找回", () => {
    const shifted = "【新增导语】" + text;
    const stale = { ...anchor }; // 旧偏移未更新
    const span = resolveSpan(shifted, stale, quote);
    expect(span).not.toBeNull();
    expect(shifted.slice(span!.start, span!.end)).toBe(quote);
  });

  it("原文已删除时返回 null（记录保留但无法定位）", () => {
    const changed = text.replace(quote, "某曲线");
    expect(resolveSpan(changed, anchor, quote)).toBeNull();
  });

  it("偏移被篡改与原文不符时退回上下文搜索", () => {
    const tampered = { ...anchor, start: 0, end: 1 };
    const span = resolveSpan(text, tampered, quote);
    expect(span).toEqual({ start, end });
  });
});
