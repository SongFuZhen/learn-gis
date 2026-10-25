/**
 * 一次性迁移：插入新 01 章（数学符号与三角函数）后，旧 01-13 → 新 02-14 的
 * 文件重命名与题目 id 重映射。
 * 顺序关键：从大到小（13→14 先行），避免小号腾出后被再次扫到。
 * 幂等：源文件不存在即视为已完成，跳过。
 * 用法：npx tsx scripts/migrate-content-insert-01.ts
 * 产物：content/gis/renumber-map-insert01.json（旧题 id → 新题 id），
 *       供 scripts/migrate-db-insert-01.ts 使用。
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.resolve(process.cwd(), "content/gis");

const NAMES: Record<string, string> = {
  "01": "basics",
  "02": "projection",
  "03": "crs-epsg",
  "04": "vector-raster",
  "05": "cartography",
  "06": "formats-tiles",
  "07": "gis-tools",
  "08": "data-quality",
  "09": "spatial-analysis",
  "10": "terrain",
  "11": "remote-sensing",
  "12": "spatial-db",
  "13": "webgis",
};

/** 从大到小执行：13→14 先行，01→02 收尾 */
const STEPS = Object.keys(NAMES)
  .map(Number)
  .sort((a, b) => b - a)
  .map((n) => ({ fromSlug: String(n).padStart(2, "0"), toSlug: String(n + 1).padStart(2, "0"), base: NAMES[String(n).padStart(2, "0")] }));

const mapPath = path.join(CONTENT_DIR, "renumber-map-insert01.json");
const renumberMap: Record<string, string> = existsSync(mapPath)
  ? JSON.parse(readFileSync(mapPath, "utf8"))
  : {};

for (const step of STEPS) {
  const fromFile = `${step.fromSlug}-${step.base}`;
  const toFile = `${step.toSlug}-${step.base}`;
  const mdxFrom = path.join(CONTENT_DIR, fromFile + ".mdx");
  const jsonFrom = path.join(CONTENT_DIR, fromFile + ".questions.json");

  if (!existsSync(mdxFrom) && !existsSync(jsonFrom)) {
    console.log("= 已迁移，跳过 " + fromFile);
    continue;
  }

  if (existsSync(mdxFrom)) {
    renameSync(mdxFrom, path.join(CONTENT_DIR, toFile + ".mdx"));
    console.log("> rename " + fromFile + ".mdx -> " + toFile + ".mdx");
  }

  if (existsSync(jsonFrom)) {
    const raw = JSON.parse(readFileSync(jsonFrom, "utf8"));
    const oldPrefix = "gis-" + step.fromSlug + "-";
    const newPrefix = "gis-" + step.toSlug + "-";
    let mapped = 0;
    for (const q of raw.questions) {
      if (typeof q.id === "string" && q.id.startsWith(oldPrefix)) {
        const newId = newPrefix + q.id.slice(oldPrefix.length);
        renumberMap[q.id] = newId;
        q.id = newId;
        q.module = step.toSlug;
        mapped += 1;
      }
    }
    raw.module = step.toSlug;
    renameSync(jsonFrom, path.join(CONTENT_DIR, toFile + ".questions.json"));
    writeFileSync(path.join(CONTENT_DIR, toFile + ".questions.json"), JSON.stringify(raw, null, 2) + "\n");
    console.log("> " + toFile + ".questions.json module=" + step.toSlug + "，重映射 " + mapped + " 题");
  }
}

writeFileSync(mapPath, JSON.stringify(renumberMap, null, 2) + "\n");
console.log("= 产物 " + mapPath + "（" + Object.keys(renumberMap).length + " 条）");
