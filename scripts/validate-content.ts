import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { formatIssues, questionFileSchema } from "../content/schema";
import { SKILL_REGISTRY } from "../content/registry";

/**
 * 内容校验：CI 与 `prebuild` 调用。
 * 按技能遍历 content/<dir>/，校验题库 JSON 的 schema、skill/module 归属、
 * 章节号是否在大纲中，以及题目 id 的全局唯一性。
 */
function main() {
  const seenIds = new Map<string, string>(); // 题目 id -> "skill/module 文件"
  let total = 0;
  let failed = 0;

  for (const skill of SKILL_REGISTRY) {
    const dir = path.resolve(process.cwd(), "content", skill.dir);
    const knownSlugs = new Set(
      [...skill.modules, ...skill.plannedModules].map((m) => m.slug),
    );

    const files = existsSafe(dir).filter((f) => f.endsWith(".questions.json"));
    if (files.length === 0) {
      console.log(`[content:validate] ${skill.id}: 没有题库文件，跳过`);
      continue;
    }

    for (const file of files) {
      const full = path.join(dir, file);
      let raw: unknown;
      try {
        raw = JSON.parse(readFileSync(full, "utf8"));
      } catch (error) {
        failed += 1;
        console.error(`✗ ${skill.id}/${file}\n  JSON 解析失败：${(error as Error).message}`);
        continue;
      }

      const parsed = questionFileSchema.safeParse(raw);
      if (!parsed.success) {
        failed += 1;
        console.error(`✗ ${skill.id}/${file}\n${formatIssues(parsed.error)}`);
        continue;
      }

      // skill 必须与所在目录一致（防止把 gis 题库拷进 cesium 目录）
      if (parsed.data.skill !== skill.id) {
        failed += 1;
        console.error(
          `✗ ${skill.id}/${file}\n  文件声明 skill "${parsed.data.skill}"，但位于 ${skill.dir} 目录`,
        );
        continue;
      }

      // module 必须在该技能的大纲里（已上线或规划中）
      if (!knownSlugs.has(parsed.data.module)) {
        failed += 1;
        console.error(
          `✗ ${skill.id}/${file}\n  module "${parsed.data.module}" 不在 ${skill.id} 课程大纲（modules.ts）中`,
        );
        continue;
      }

      // 题目 id 全站唯一（跨技能也不得重复）
      for (const question of parsed.data.questions) {
        const key = `${skill.id}/${file}`;
        const previous = seenIds.get(question.id);
        if (previous) {
          failed += 1;
          console.error(`✗ ${key}: 题目 id 与 ${previous} 重复：${question.id}`);
        }
        seenIds.set(question.id, key);
      }

      total += parsed.data.questions.length;
      console.log(`✓ ${skill.id}/${file}（${parsed.data.questions.length} 题）`);
    }
  }

  console.log(`[content:validate] ${SKILL_REGISTRY.length} 个技能 / ${total} 题`);
  if (failed > 0) {
    console.error(`[content:validate] 失败：${failed} 个问题`);
    process.exit(1);
  }
}

function existsSafe(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

main();
