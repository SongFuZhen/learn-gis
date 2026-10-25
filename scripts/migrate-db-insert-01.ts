/**
 * 一次性 DB 迁移：配合 scripts/migrate-content-insert-01.ts 使用。
 * 插入新 01 章后，旧 01-13 → 新 02-14：module_slug 升位、question_id 重映射。
 *   npx tsx scripts/migrate-db-insert-01.ts --dry-run   # 只打印将影响的行数
 *   npx tsx scripts/migrate-db-insert-01.ts             # 真正执行
 * 顺序关键：SLUG_MAP 从大到小（13→14 先行），避免小号腾出前被再次扫到。
 * 幂等：module_slug 映射用「仅当旧值存在才 UPDATE」；question_id 映射为批量 VALUES 单语句。
 * 上线顺序：先部署新代码，再对本库执行本脚本。
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";

const MAP_PATH = path.resolve(process.cwd(), "content/gis/renumber-map-insert01.json");
const map: Record<string, string> = existsSync(MAP_PATH)
  ? JSON.parse(readFileSync(MAP_PATH, "utf8"))
  : {};
const dryRun = process.argv.includes("--dry-run");

/** 旧 module slug → 新 slug（顺序：从大到小，避免二次扫到） */
const SLUG_MAP: Record<string, string> = {
  "13": "14",
  "12": "13",
  "11": "12",
  "10": "11",
  "09": "10",
  "08": "09",
  "07": "08",
  "06": "07",
  "05": "06",
  "04": "05",
  "03": "04",
  "02": "03",
  "01": "02",
};

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
      if (dryRun) {
        const c = await client.query(
          "SELECT count(*)::int AS n FROM gis.module_progress WHERE module_slug = $1",
          [from],
        );
        console.log(`module_progress ${from} -> ${to}: ${c.rows[0].n} 行（dry-run）`);
        continue;
      }
      const r = await client.query(
        "UPDATE gis.module_progress SET module_slug = $1 WHERE module_slug = $2",
        [to, from],
      );
      console.log(`module_progress ${from} -> ${to}: ${r.rowCount} 行`);
    }

    // 2) wrong_answers.module_slug
    for (const [from, to] of Object.entries(SLUG_MAP)) {
      if (dryRun) {
        const c = await client.query(
          "SELECT count(*)::int AS n FROM gis.wrong_answers WHERE module_slug = $1",
          [from],
        );
        console.log(`wrong_answers.module_slug ${from} -> ${to}: ${c.rows[0].n} 行（dry-run）`);
        continue;
      }
      const r = await client.query(
        "UPDATE gis.wrong_answers SET module_slug = $1 WHERE module_slug = $2",
        [to, from],
      );
      console.log(`wrong_answers.module_slug ${from} -> ${to}: ${r.rowCount} 行`);
    }

    // 3) wrong_answers.question_id：批量 VALUES 单语句重映射
    const entries = Object.entries(map);
    if (entries.length > 0) {
      if (dryRun) {
        console.log(`question_id 重映射（dry-run）：映射表 ${entries.length} 条`);
      } else {
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
    }

    if (dryRun) {
      await client.query("ROLLBACK");
      console.log("= dry-run 完成，已回滚");
    } else {
      await client.query("COMMIT");
      console.log("= 迁移完成");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
