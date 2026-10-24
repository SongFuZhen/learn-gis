/**
 * 一次性 DB 迁移：配合 scripts/migrate-content-renumber.ts 使用。
 * 先跑内容迁移生成 content/gis/renumber-map.json，再对本脚本执行：
 *   npx tsx scripts/migrate-db-renumber.ts --dry-run   # 只打印将影响的行数
 *   npx tsx scripts/migrate-db-renumber.ts             # 真正执行
 * 幂等：module_slug 映射用「仅当旧值存在才 UPDATE」；question_id 映射为批量 VALUES 单语句。
 * 上线顺序：先部署新代码，再对本库执行本脚本。
 * 连接参数与 db/index.ts 一致（Neon 池器需要 keepAlive）。
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
// 顺序关键：先迁 06→13、07→12，再 05→06，避免旧 05 的行被第二次扫到
const SLUG_MAP: Record<string, string> = { "06": "13", "07": "12", "05": "06" };

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
  pool.on("error", (err) => console.error("[pool error]", err.message));
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

    // 3) wrong_answers.question_id：批量 VALUES 单语句重映射（避免长循环被池器掐断）
    const entries = Object.entries(map);
    if (entries.length > 0) {
      const values: unknown[] = [];
      const tuples = entries.map(([oldId, newId], i) => {
        values.push(oldId, newId);
        return `($${i * 2 + 1}::text, $${i * 2 + 2}::text)`;
      });
      const r = await client.query(
        `UPDATE gis.wrong_answers wa SET question_id = v.new_id
         FROM (VALUES ${tuples.join(",")}) AS v(old_id, new_id)
         WHERE wa.question_id = v.old_id`,
        values,
      );
      console.log(`wrong_answers.question_id 重映射: ${r.rowCount} 行（映射表 ${entries.length} 条）`);
    }

    // 4) 清理被删题目的错题记录（单语句 ANY）
    if (deletedIds.length > 0) {
      const r = await client.query(
        "DELETE FROM gis.wrong_answers WHERE question_id = ANY($1::text[])",
        [deletedIds],
      );
      console.log(`wrong_answers 删除已下架题目记录: ${r.rowCount} 行（清单 ${deletedIds.length} 条）`);
    }

    if (dryRun) {
      await client.query("ROLLBACK");
      console.log("[migrate-db-renumber] dry-run 已回滚，未写入");
    } else {
      await client.query("COMMIT");
      console.log("[migrate-db-renumber] 已提交");
    }
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* 连接已断 */ }
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
