import type { AnnotationKind } from "./highlight";

export type ConflictReason = "overlap" | "duplicate";

type Existing = {
  id: string;
  kind: AnnotationKind;
  anchor: { start: number; end: number };
};

/**
 * 纯函数：判断新选区与本章已有划线是否冲突。
 * - duplicate：同区间且同类型（重复划线无意义）
 * - overlap：字符区间相交（嵌套/交叉划线会破坏 mark 包裹，直接拒绝）
 * 无冲突返回 null。
 */
export function findConflict(
  items: Existing[],
  span: { start: number; end: number },
  kind: AnnotationKind,
): { id: string; reason: ConflictReason } | null {
  for (const item of items) {
    const sameSpan =
      item.anchor.start === span.start && item.anchor.end === span.end;
    if (sameSpan && item.kind === kind) {
      return { id: item.id, reason: "duplicate" };
    }
    const intersects =
      span.start < item.anchor.end && span.end > item.anchor.start;
    if (intersects) {
      return { id: item.id, reason: "overlap" };
    }
  }
  return null;
}
