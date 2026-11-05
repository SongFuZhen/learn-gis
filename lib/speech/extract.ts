import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";

export type SegmentKind =
  | "heading"
  | "paragraph"
  | "list-item"
  | "callout"
  | "exercise"
  | "table-skipped"
  | "blockquote";

export interface SpeechSegment {
  text: string;
  kind: SegmentKind;
  headingLevel?: number;
}

// JSX 组件处理：跳过交互/答案类；保留讲义类（去标签后读内部文本）
const SKIP_JSX = new Set([
  "ProjPlayground",
  "EmbedMap",
  "ExerciseSolution",
  "Quiz",
  "Question",
  "MapView",
  "Playground",
]);

// 装饰性 emoji / 符号（朗读无意义）
const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{2600}-\u{26FF}]/gu;

// IPA 音标含非 ASCII 字符；借此与 `sin/cos/tan` 这类普通斜杠区分，避免误删。
const IPA_CHAR = /[\u0250-\u02AF\u1D00-\u1D7F\u02B0-\u02FF]/;
// 谐音拐杖用「-」分音节（如「吉-艾-艾斯」）；正文引用（如「差值」）不含此特征，保留。
const HARMONY_RE = /「[^」]*-[^」]*」/g;
// 去一段文本里的 IPA 段：逐字符找成对斜杠，只有段内含音标字符才删（保留 sin/cos/tan、fishnet/grid 等普通斜杠）
function stripIpa(s: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s.charAt(i);
    if (c === "/") {
      const j = s.indexOf("/", i + 1);
      if (j > i + 1 && j - i - 1 <= 60 && !s.slice(i + 1, j).includes("\n")) {
        if (IPA_CHAR.test(s.slice(i, j + 1))) {
          out.push("，");
          i = j + 1;
          continue;
        }
      }
    }
    out.push(c);
    i++;
  }
  return out.join("");
}

// 逐字符扫描全角括号并配对（支持嵌套）：注音块去 IPA + 谐音，保留英文术语/中文释义；普通括号原样保留。
function stripAnnotations(s: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    if (s.charAt(i) === "（") {
      let depth = 1, j = i + 1;
      while (j < s.length && depth > 0) {
        const cj = s.charAt(j);
        if (cj === "（") depth++;
        else if (cj === "）") depth--;
        j++;
      }
      if (depth === 0) {
        const inner = s.slice(i + 1, j - 1);
        const hasIpa = IPA_CHAR.test(inner);
        const hasHarmony = /「[^」]*-[^」]*」/.test(inner);
        if (hasIpa || hasHarmony) {
          let x = stripAnnotations(inner);          // 递归处理嵌套注音块
          x = stripIpa(x);
          x = x.replace(HARMONY_RE, "，");
          x = x.replace(/[，,；;]\s*[，,；;]+/g, "，")
               .replace(/^[，,；;\s]+|[，,；;\s]+$/g, "");
          if (x) out.push(`（${x}）`);
        } else {
          out.push(`（${inner}）`);
        }
        i = j;
        continue;
      }
    }
    out.push(s.charAt(i));
    i++;
  }
  return out.join("");
}

// 作用于普通 text 节点：删注音块、散落的 IPA 与谐音拐杖；不动正文引用「」
function cleanTextNode(raw: string): string {
  let s = stripAnnotations(raw);
  s = s.replace(/\/[^/\n]{1,60}\//g, (m) => (IPA_CHAR.test(m) ? " " : m));
  s = s.replace(HARMONY_RE, "");
  return s;
}

// 作用于行内 code：整体保留（含 π/180 等公式）；仅把纯英文术语列表的 / 换成顿号，便于逐词朗读
function cleanInlineCode(raw: string): string {
  if (/^[A-Za-z][A-Za-z0-9]*(\s*\/\s*[A-Za-z][A-Za-z0-9]*)+$/.test(raw)) {
    return raw.replace(/\s*\/\s*/g, "、");
  }
  return raw;
}

// 通用清洗：只做符号/空白，不再碰 IPA（已在节点层处理）
function cleanText(raw: string): string {
  let s = raw;
  s = s.replace(/\\([\\*_~()])/g, "$1");
  s = s.replace(/[*_`~]/g, "");
  s = s.replace(/→/g, "到");
  s = s.replace(/≈/g, "约等于");
  s = s.replace(/±/g, "正负");
  s = s.replace(/·/g, "乘");
  s = s.replace(EMOJI_RE, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// 最小结构节点：mdast + MDX 扩展节点（mdxJsx*）的公共形状，避免 any
interface MdNode {
  type?: string;
  value?: string;
  name?: string;
  depth?: number;
  children?: unknown;
}

/** 把 children（unknown）收敛为 MdNode[]，类型不匹配的节点按空处理 */
function kids(n: MdNode | undefined): MdNode[] {
  const c = n?.children;
  return Array.isArray(c) ? (c as MdNode[]) : [];
}

function gatherPhrasing(nodes: MdNode[]): string {
  const parts: string[] = [];
  for (const n of nodes) {
    const r = phrase(n);
    if (r) parts.push(r);
  }
  let joined = parts.join(" ");
  // **S**in 这类「加粗首字母」会把单词拆成 `S in`，合并回完整词，避免逐字母朗读
  joined = joined.replace(/\b([A-Za-z])\s+([a-z]{2,})\b/g, "$1$2");
  return cleanText(joined);
}

function phrase(n: MdNode | undefined): string {
  if (!n) return "";
  switch (n.type) {
    case "text":
      return cleanTextNode(n.value ?? "");
    case "inlineCode":
      return cleanInlineCode(n.value ?? ""); // 保留公式/术语，不删斜杠
    case "strong":
    case "emphasis":
    case "delete":
      return gatherPhrasing(kids(n));
    case "link":
    case "linkReference":
      return gatherPhrasing(kids(n));
    case "break":
      return " ";
    case "mdxJsxTextElement":
    case "html":
      return "";
    default:
      return gatherPhrasing(kids(n));
  }
}

function blockText(n: MdNode | undefined): string {
  if (!n) return "";
  switch (n.type) {
    case "paragraph":
    case "heading":
      return gatherPhrasing(kids(n));
    case "list":
    case "blockquote":
    case "listItem":
      return kids(n).map(blockText).join(" ");
    case "code":
    case "table":
      return "";
    case "mdxJsxFlowElement": {
      if (SKIP_JSX.has(n.name ?? "")) return "";
      return kids(n).map(blockText).join(" ");
    }
    default:
      return kids(n).map(blockText).join(" ");
  }
}

function walkBlocks(nodes: unknown, out: SpeechSegment[]): void {
  const list: MdNode[] = Array.isArray(nodes) ? (nodes as MdNode[]) : [];
  for (const n of list) {
    switch (n.type) {
      case "heading": {
        const text = gatherPhrasing(kids(n));
        if (text) out.push({ text, kind: "heading", headingLevel: n.depth });
        break;
      }
      case "paragraph": {
        const text = gatherPhrasing(kids(n));
        if (text) out.push({ text, kind: "paragraph" });
        break;
      }
      case "blockquote":
        walkBlocks(kids(n), out);
        break;
      case "list":
        for (const li of kids(n)) {
          const text = blockText(li);
          if (text) out.push({ text, kind: "list-item" });
        }
        break;
      case "table":
        out.push({ text: "（本节含表格，建议查看原文）", kind: "table-skipped" });
        break;
      case "code":
      case "html":
      case "thematicBreak":
        break;
      case "mdxJsxFlowElement": {
        if (SKIP_JSX.has(n.name ?? "")) break;
        walkBlocks(kids(n), out);
        break;
      }
      default:
        walkBlocks(kids(n), out);
    }
  }
}

export function extractSpeechSegments(mdx: string): SpeechSegment[] {
  let src = mdx;
  const fm = src.match(/^---\n[\s\S]*?\n---\n?/);
  if (fm) src = src.slice(fm[0].length);

  const tree = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkGfm)
    .parse(src) as Root;

  const out: SpeechSegment[] = [];
  walkBlocks(tree.children, out);
  return out.filter((s) => s.text.length > 0);
}
