import { findRange, walkTextNodes, type AnnotationAnchor } from "./anchor";

export type AnnotationKind = "note" | "record" | "question";

export type HighlightTarget = {
  id: string;
  kind: AnnotationKind;
  anchor: AnnotationAnchor;
  quote: string;
};

export const MARK_CLASS = "anno-mark";

/** 清除容器内全部划线 mark，保留文本（unwrap） */
export function clearMarks(root: HTMLElement): void {
  const marks = Array.from(root.querySelectorAll<HTMLElement>(`mark.${MARK_CLASS}`));
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize?.();
  }
}

/**
 * 全量重渲染：先清空旧 mark，再按 targets 逐条包裹。
 * 锚点失效（讲义改版）的条目跳过，返回其 id 供 UI 标「无法定位」。
 */
export function renderHighlights(
  root: HTMLElement,
  targets: HighlightTarget[],
): string[] {
  clearMarks(root);
  const unresolved: string[] = [];

  for (const target of targets) {
    const range = findRange(root, target.anchor, target.quote);
    if (!range) {
      unresolved.push(target.id);
      continue;
    }
    if (!wrapRange(root, range, target)) unresolved.push(target.id);
  }
  return unresolved;
}

/** 跨元素选区：对与 range 相交的每个 TextNode 分别包 mark */
function wrapRange(
  root: HTMLElement,
  range: Range,
  target: HighlightTarget,
): boolean {
  const textNodes = walkTextNodes(root).filter((node) =>
    range.intersectsNode(node),
  );
  if (textNodes.length === 0) return false;

  for (const node of textNodes) {
    const sub = document.createRange();
    sub.selectNodeContents(node);
    if (node === range.startContainer) sub.setStart(node, range.startOffset);
    if (node === range.endContainer) sub.setEnd(node, range.endOffset);
    if (sub.collapsed) continue;

    const mark = document.createElement("mark");
    mark.className = `${MARK_CLASS} anno-${target.kind}`;
    mark.dataset.annotationId = target.id;
    try {
      sub.surroundContents(mark);
    } catch {
      // 节点边界异常（被部分包裹等）：该条放弃，不影响其他标注
      return false;
    }
  }
  return true;
}
