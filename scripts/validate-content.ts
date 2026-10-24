import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { formatIssues, questionFileSchema } from "../content/schema";
import { GIS_MODULES, PLANNED_MODULES } from "../content/gis/modules";

/**
 * 内容校验：CI 与 `prebuild` 调用。
 * 任何题库 JSON 不符合 content/schema.ts 即非零退出，阻断发布。
 */
const CONTENT_DIR = path.resolve(process.cwd(), "content/gis");

function main() {
  const files = readdirSync(CONTENT_DIR).filter((f) =>
    f.endsWith(".questions.json"),
  );

  if (files.length === 0) {
    console.log("[content:validate] 没有题库文件，跳过");
    return;
  }

  const seen = new Map<string, string>();
  let total = 0;
  let failed = 0;

  for (const file of files) {
    const full = path.join(CONTENT_DIR, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(full, "utf8"));
    } catch (error) {
      failed += 1;
      console.error(`✗ ${file}\n  JSON 解析失败：${(error as Error).message}`);
      continue;
    }

    const parsed = questionFileSchema.safeParse(raw);
    if (!parsed.success) {
      failed += 1;
      console.error(`✗ ${file}\n${formatIssues(parsed.error)}`);
      continue;
    }

    // module 必须在大纲里（已上线或规划中），防止文件改名后注册表漏同步
    const knownSlugs = new Set([...GIS_MODULES, ...PLANNED_MODULES].map((m) => m.slug));
    if (!knownSlugs.has(parsed.data.module)) {
      failed += 1;
      console.error(
        `✗ ${file}\n  module "${parsed.data.module}" 不在课程大纲（modules.ts）中`,
      );
      continue;
    }

    for (const question of parsed.data.questions) {
      const previous = seen.get(question.id);
      if (previous) {
        failed += 1;
        console.error(`✗ ${file}: 题目 id 与 ${previous} 重复：${question.id}`);
      }
      seen.set(question.id, file);
    }

    total += parsed.data.questions.length;
    console.log(`✓ ${file}（${parsed.data.questions.length} 题）`);
  }

  console.log(`[content:validate] ${files.length} 个文件 / ${total} 题`);
  if (failed > 0) {
    console.error(`[content:validate] 失败：${failed} 个问题`);
    process.exit(1);
  }
}

main();
