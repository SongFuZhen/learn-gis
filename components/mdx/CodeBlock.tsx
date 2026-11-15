import { isValidElement, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { highlightCode, resolveLang } from "@/lib/mdx/highlighter";

/** 超过此行数的代码块默认折叠；短片段直接展示，不打断阅读 */
const COLLAPSE_THRESHOLD = 6;

const LANG_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  bash: "Bash",
  sql: "SQL",
  json: "JSON",
  json5: "JSON5",
  html: "HTML",
  glsl: "GLSL",
  text: "代码",
};

/** 递归把 React 子节点拍平成纯文本（代码块内通常只有一个字符串 child） */
function toPlainText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toPlainText).join("");
  if (isValidElement(node)) {
    return toPlainText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/** 从 <code className="language-js"> 提取围栏语言；无标注视为 text */
function readLang(className?: string): string {
  const match = /language-([\w-]+)/.exec(className ?? "");
  return match?.[1]?.toLowerCase() ?? "text";
}

/**
 * 接管 MDX 的 <pre>：Shiki 构建期高亮 + 长代码块 <details> 默认折叠。
 * 纯服务端组件，零客户端 JS；折叠态代码文本仍挂载在 DOM，标注锚点偏移不受影响。
 */
export default async function CodeBlock({ children }: { children?: ReactNode }) {
  if (!isValidElement(children)) {
    return <pre>{children}</pre>;
  }

  const codeProps = children.props as { className?: string; children?: ReactNode };
  const rawLang = readLang(codeProps.className);
  const lang = resolveLang(rawLang);
  const code = toPlainText(codeProps.children).replace(/\n$/, "");
  const lineCount = code.split("\n").length;
  const html = await highlightCode(code, rawLang);
  const label = LANG_LABELS[lang] ?? LANG_LABELS.text;

  if (lineCount <= COLLAPSE_THRESHOLD) {
    return (
      <div className="mdx-code">
        {/* 高亮 HTML 来自本地 MDX 的构建期 Shiki 输出，内容可信 */}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }

  return (
    <details className="mdx-code mdx-code--collapsible">
      <summary className="mdx-code__summary marker:content-['']">
        <ChevronRight className="mdx-code__chevron" size={15} aria-hidden="true" />
        <span className="mdx-code__lang">{label}</span>
        <span className="mdx-code__meta">{lineCount} 行</span>
        <span className="mdx-code__toggle mdx-code__toggle--closed" aria-hidden="true">
          展开
        </span>
        <span className="mdx-code__toggle mdx-code__toggle--open" aria-hidden="true">
          收起
        </span>
      </summary>
      <div className="mdx-code__body" dangerouslySetInnerHTML={{ __html: html }} />
    </details>
  );
}
