/**
 * 一次性 DB 迁移：配合 scripts/migrate-content-renumber.ts 使用。
 * 先跑内容迁移生成 content/gis/renumber-map.json，再对本脚本执行：
 *   npx tsx scripts/migrate-db-renumber.ts --dry-run   # 只打印将影响的行数
 *   npx tsx scripts/migrate-db-renumber.ts             # 真正执行
 * 幂等：module_slug 映射用「仅当旧值存在才 UPDATE」；question_id 映射逐条按旧 id 条件更新。
 * 上线顺序：先部署新代码，再对本库执行本脚本。
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";

const MAP_PATH = path.resolve(process.cwd(), "content/gis/renumber-map.json");
const map: Record<string, string> = JSON.parse(readFileSync(MAP_PATH, "utf8"));
const DELETED_PATH = path.resolve(process.cwd(), "content/gis/renumber-deleted.json");
const deletedIds: string[] = existsSync(DELETED_PATH)
  ? JSON.parse(readFileSync(DELETED_PATH, "utf8"))
  : [];
const dryRun = process.argv.includes("--dry-run");

/** 旧 module slug → 新 slug（与内容迁移同一映射） */
const SLUG_MAP: Record<string, string> = { "05": "06", "06": "13", "07": "12" };

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) module_progress.module_slug
    for (const [from, to] of Object.entries(SLUG_MAP)) {
      const r = await client.query(
        "UPDATE gis.module_progress SET module_slug = $1 WHERE module_slug = $2",
        [to, from],
      );
      console.log(`module_progress ${from} -> ${to}: ${r.rowCount} 行`);
    }

    // 2) wrong_answers.module_slug
    for (const [from, to] of Object.entries(SLUG_MAP)) {
      const r = await client.query(
        "UPDATE gis.wrong_answers SET module_slug = $1 WHERE module_slug = $2",
        [to, from],
      );
      console.log(`wrong_answers.module_slug ${from} -> ${to}: ${r.rowCount} 行`);
    }

    // 3) wrong_answers.question_id 逐条映射；无 unique 冲突（旧 id 已不存在）
    let mapped = 0;
    for (const [oldId, newId] of Object.entries(map)) {
      const r = await client.query(
        "UPDATE gis.wrong_answers SET question_id = $1 WHERE question_id = $2",
        [newId, oldId],
      );
      mapped += r.rowCount ?? 0;
    }
    console.log(`wrong_answers.question_id 重映射: ${mapped} 行（映射表 ${Object.keys(map).length} 条）`);

    // 4) 清理被删题目的错题记录（如批次 2 删除的 06 章模板克隆题）
    if (deletedIds.length > 0) {
      let removed = 0;
      for (const id of deletedIds) {
        const r = await client.query(
          "DELETE FROM gis.wrong_answers WHERE question_id = $1",
          [id],
        );
        removed += r.rowCount ?? 0;
      }
      console.log(`wrong_answers 删除已下架题目记录: ${removed} 行（清单 ${deletedIds.length} 条）`);
    }

    if (dryRun) {
      await client.query("ROLLBACK");
      console.log("[migrate-db-renumber] dry-run 已回滚，未写入");
    } else {
      await client.query("COMMIT");
      console.log("[migrate-db-renumber] 已提交");
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
