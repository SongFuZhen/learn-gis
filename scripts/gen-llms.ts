/**
 * 生成 public/llms.txt（llmstxt.org 约定：H1 站点名 + blockquote 简介 + 分节链接清单）。
 * 数据源：content/curriculum.ts（registry 派生），零手工维护。
 * 用法：npm run gen:llms（挂在 prebuild 链上）。
 */
import fs from "node:fs";
import path from "node:path";
import { CURRICULUM } from "../content/curriculum";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "../lib/site";

function escapeMd(text: string): string {
  return text.replace(/\n+/g, " ").trim();
}

function build(): string {
  const lines: string[] = [];
  lines.push(`# ${SITE_NAME}`);
  lines.push("");
  lines.push(`> ${SITE_DESCRIPTION}`);
  lines.push("");
  lines.push(
    `> 全站共 ${CURRICULUM.length} 门课程、${CURRICULUM.reduce(
      (n, s) => n + s.chapterCount,
      0,
    )} 章讲义、${CURRICULUM.reduce((n, s) => n + s.totalQuestions, 0)} 道校验题库。`,
  );
  lines.push("");

  for (const skill of CURRICULUM) {
    const prereq =
      skill.prerequisites.length > 0
        ? `（前置课程：${skill.prerequisites.join(" → ")}）`
        : "（无前置课程）";
    lines.push(`## ${skill.title} [${skill.id}] · ${skill.trackLabel}轨`);
    lines.push("");
    lines.push(`${escapeMd(skill.description)}${prereq}`);
    lines.push("");
    for (const ch of skill.chapters) {
      const url = `${SITE_URL}/s/${skill.id}/${ch.slug}`;
      lines.push(
        `- [${ch.title}](${url})：${escapeMd(ch.summary)}（${ch.questionCount} 题）`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

const out = path.join(process.cwd(), "public", "llms.txt");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, build(), "utf8");
console.log(`[gen:llms] 写入 ${out}`);
