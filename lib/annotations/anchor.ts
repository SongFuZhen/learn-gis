/**
 * 讲义划线的文本锚点。
 * 主锚点是 article 全文（所有 TextNode 拼接）上的字符偏移；
 * prefix/suffix 是选中段前后的上下文，讲义改版导致偏移失效时兜底搜索。
 */

export type AnnotationAnchor = {
  start: number;
  end: number;
  prefix: string;
  suffix: string;
};

export const CONTEXT_LEN = 24;

/** 纯函数：由全文与起止偏移生成锚点（含上下文） */
export function buildAnchorFromText(
  fullText: string,
  start: number,
  end: number,
): AnnotationAnchor {
  return {
    start,
    end,
    prefix: fullText.slice(Math.max(0, start - CONTEXT_LEN), start),
    suffix: fullText.slice(end, end + CONTEXT_LEN),
  };
}

/**
 * 纯函数：在当前全文里解析锚点对应的字符区间。
 * 1) 偏移仍命中同一段原文 → 直接用；
 * 2) 否则用 prefix+原文+suffix 兜底搜索；
 * 3) 都失败 → null（记录保留，UI 提示无法定位）。
 */
export function resolveSpan(
  fullText: string,
  anchor: AnnotationAnchor,
  quote: string,
): { start: number; end: number } | null {
  const { start, end, prefix, suffix } = anchor;

  if (
    start >= 0 &&
    end <= fullText.length &&
    start < end &&
    fullText.slice(start, end) === quote
  ) {
    return { start, end };
  }

  const needle = prefix + quote + suffix;
  const hit = fullText.indexOf(needle);
  if (hit >= 0) {
    return { start: hit + prefix.length, end: hit + prefix.length + quote.length };
  }

  return null;
}

/** 深度优先收集容器内全部文本节点（顺序与 textContent 一致） */
export function walkTextNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current.textContent && current.textContent.length > 0) {
      nodes.push(current as Text);
    }
    current = walker.nextNode();
  }
  return nodes;
}

/** 把全文全局偏移换算成「某个 TextNode + 节点内偏移」 */
function locateNodeOffset(
  nodes: Text[],
  globalOffset: number,
): { node: Text; offset: number } | null {
  let cursor = 0;
  for (const node of nodes) {
    const len = node.textContent?.length ?? 0;
    if (globalOffset <= cursor + len) {
      return { node, offset: Math.max(0, globalOffset - cursor) };
    }
    cursor += len;
  }
  const last = nodes[nodes.length - 1];
  return last ? { node: last, offset: last.textContent?.length ?? 0 } : null;
}

/** 计算某个文本节点在容器全文中的起始全局偏移 */
function globalOffsetOf(nodes: Text[], target: Text): number {
  let cursor = 0;
  for (const node of nodes) {
    if (node === target || node.isSameNode(target)) return cursor;
    cursor += node.textContent?.length ?? 0;
  }
  return cursor;
}

/** DOM：从用户选区 Range 构建锚点 */
export function buildAnchor(root: HTMLElement, range: Range): AnnotationAnchor | null {
  if (range.collapsed) return null;
  // 选区边界落在元素节点（如整段选择的块边界）时，offset 是子节点下标而非文本偏移，
  // 无法安全换算为全局字符偏移：放弃建锚点，由调用方收起工具条，避免存下错误区间
  if (
    range.startContainer.nodeType !== Node.TEXT_NODE ||
    range.endContainer.nodeType !== Node.TEXT_NODE
  ) {
    return null;
  }
  const nodes = walkTextNodes(root);
  const fullText = nodes.map((n) => n.textContent ?? "").join("");

  const start =
    globalOffsetOf(nodes, range.startContainer as Text) + range.startOffset;
  const endBase = globalOffsetOf(nodes, range.endContainer as Text);
  const end = endBase + range.endOffset;

  if (start < 0 || end <= start || end > fullText.length) return null;
  return buildAnchorFromText(fullText, start, end);
}

/** DOM：把锚点还原成 Range；无法定位返回 null */
export function findRange(
  root: HTMLElement,
  anchor: AnnotationAnchor,
  quote: string,
): Range | null {
  const fullText = root.textContent ?? "";
  const span = resolveSpan(fullText, anchor, quote);
  if (!span) return null;

  const nodes = walkTextNodes(root);
  const startPoint = locateNodeOffset(nodes, span.start);
  const endPoint = locateNodeOffset(nodes, span.end);
  if (!startPoint || !endPoint) return null;

  const range = document.createRange();
  range.setStart(startPoint.node, startPoint.offset);
  range.setEnd(endPoint.node, endPoint.offset);
  return range;
}
