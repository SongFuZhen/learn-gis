import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import javascript from "@shikijs/langs/javascript";
import typescript from "@shikijs/langs/typescript";
import bash from "@shikijs/langs/bash";
import sql from "@shikijs/langs/sql";
import json from "@shikijs/langs/json";
import json5 from "@shikijs/langs/json5";
import html from "@shikijs/langs/html";
import glsl from "@shikijs/langs/glsl";
import githubLight from "@shikijs/themes/github-light";
import githubDarkDefault from "@shikijs/themes/github-dark-default";

/**
 * 讲义代码块高亮：Shiki 单例，构建期在 RSC 中运行，产物为静态 HTML，
 * 运行时零客户端 JS。双主题通过 CSS 变量（--shiki-light* / --shiki-dark*）
 * 配合 globals.css 的 .dark 规则切换。
 */

/** 围栏标注 → Shiki 语言 id；未列出或无标注走内置 text（plaintext，无需 grammar） */
const LANG_ALIAS: Record<string, string> = {
  js: "javascript",
  javascript: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  typescript: "typescript",
  tsx: "typescript",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  sql: "sql",
  json: "json",
  json5: "json5",
  html: "html",
  glsl: "glsl",
};

/** 围栏标注归一化为 Shiki 语言 id；未知或无标注回退 text */
export function resolveLang(rawLang: string): string {
  return LANG_ALIAS[rawLang.toLowerCase()] ?? "text";
}

const highlighterPromise: Promise<HighlighterCore> = createHighlighterCore({
  themes: [githubLight, githubDarkDefault],
  langs: [javascript, typescript, bash, sql, json, json5, html, glsl],
  engine: createOnigurumaEngine(import("shiki/wasm")),
});

/**
 * 把代码字符串高亮为 HTML（Shiki 双主题 <pre class="shiki ...">）。
 * 未知语言回退 text，绝不抛错打断 SSG。
 */
export async function highlightCode(code: string, rawLang: string): Promise<string> {
  const highlighter = await highlighterPromise;
  const lang = resolveLang(rawLang);
  return highlighter.codeToHtml(code, {
    lang,
    themes: {
      light: "github-light",
      dark: "github-dark-default",
    },
    // 只保留语言 class，去掉 Shiki 默认内联背景色（背景交给 CSS 变量按主题切换）
    defaultColor: false,
  });
}
