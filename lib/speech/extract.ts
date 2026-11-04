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

const READ_JSX = new Set(["Callout", "Exercise", "Note", "Tip", "Warning"]);

// 装饰性 emoji / 符号（朗读无意义）
const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{2600}-\u{26FF}]/gu;

// IPA 注音 /.../（保留「谐音」部分）
const IPA_RE = /\/[^/\n]{1,40}\//g;

function cleanText(raw: string): string {
  let s = raw;
  s = s.replace(IPA_RE, " ");
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

function gatherPhrasing(nodes: any[]): string {
  const parts: string[] = [];
  for (const n of nodes ?? []) {
    const r = phrase(n);
    if (r) parts.push(r);
  }
  return cleanText(parts.join(" "));
}

function phrase(n: any): string {
  if (!n) return "";
  switch (n.type) {
    case "text":
      return n.value;
    case "inlineCode":
      return n.value; // 去反引号，保留文字（如 sin/cos）
    case "strong":
    case "emphasis":
    case "delete":
      return gatherPhrasing(n.children);
    case "link":
    case "linkReference":
      return gatherPhrasing(n.children);
    case "break":
      return " ";
    case "mdxJsxTextElement":
    case "html":
      return "";
    default:
      if (Array.isArray(n.children)) return gatherPhrasing(n.children);
      return "";
  }
}

function blockText(n: any): string {
  if (!n) return "";
  switch (n.type) {
    case "paragraph":
    case "heading":
      return gatherPhrasing(n.children);
    case "list":
    case "blockquote":
    case "listItem":
      return (n.children ?? []).map(blockText).join(" ");
    case "code":
    case "table":
      return "";
    case "mdxJsxFlowElement": {
      if (SKIP_JSX.has(n.name)) return "";
      return (n.children ?? []).map(blockText).join(" ");
    }
    default:
      if (Array.isArray(n.children)) return n.children.map(blockText).join(" ");
      return "";
  }
}

function walkBlocks(nodes: any[], out: SpeechSegment[]): void {
  for (const n of nodes ?? []) {
    switch (n.type) {
      case "heading": {
        const text = gatherPhrasing(n.children);
        if (text) out.push({ text, kind: "heading", headingLevel: n.depth });
        break;
      }
      case "paragraph": {
        const text = gatherPhrasing(n.children);
        if (text) out.push({ text, kind: "paragraph" });
        break;
      }
      case "blockquote":
        walkBlocks(n.children, out);
        break;
      case "list":
        for (const li of n.children ?? []) {
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
        if (SKIP_JSX.has(n.name)) break;
        walkBlocks(n.children ?? [], out);
        break;
      }
      default:
        if (Array.isArray(n.children)) walkBlocks(n.children, out);
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
