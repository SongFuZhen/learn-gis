/** 讲义章节目录（TOC）：MDX h2 提取 + 锚点 id 生成 */

export type TocItem = {
  /** 锚点 id，与 mdx-components 里 h2 的 id 生成规则一致 */
  id: string;
  /** 标题纯文本（已去掉 markdown 记号） */
  text: string;
};

/**
 * 标题文本 → 锚点 id：去掉 markdown 记号与中英文标点，
 * 空白折叠成「-」。TOC 提取与 h2 渲染共用，保证两边 id 一致。
 */
export function headingId(text: string): string {
  return text
    .replace(/[*`~_]/g, "")
    .replace(/[\s.。,，:：;；?？!！'"“”‘’()（）【】\[\]「」·—…]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/** 从 MDX 源码提取所有 h2 标题（按出现顺序） */
export function extractToc(source: string): TocItem[] {
  const items: TocItem[] = [];
  for (const line of source.split("\n")) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const text = match[1]?.replace(/[*`]/g, "").trim() ?? "";
    items.push({ id: headingId(text), text });
  }
  return items;
}

/** ReactNode → 纯文本（h2 组件生成 id 用） */
export function nodeText(node: unknown): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(nodeText).join("");
  }
  if (typeof node === "object" && "props" in (node as Record<string, unknown>)) {
    const props = (node as { props?: { children?: unknown } }).props;
    return nodeText(props?.children);
  }
  return "";
}
