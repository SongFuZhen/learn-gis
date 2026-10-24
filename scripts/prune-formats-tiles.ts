/**
 * 一次性清理：06-formats-tiles 题库中 gen-banks/m04 模板产出的同构算术题。
 * 每类模板保留 3 道代表题（按 id 序取前 3），其余删除。
 * 删除的 id 写入 content/gis/renumber-deleted.json，供 migrate-db-renumber.ts 清理错题记录。
 * 幂等：重复执行时已删除的模板题不再存在，输出 0 即已完成。
 * 用法：npx tsx scripts/prune-formats-tiles.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { questionFileSchema } from "../content/schema";

const CONTENT_DIR = path.resolve(process.cwd(), "content/gis");
const FILE = "06-formats-tiles.questions.json";

/** m04 生成器的 8 类模板句式（与 scripts/gen-banks/m04.ts 逐一对应） */
const TEMPLATES: { name: string; re: RegExp; keep: number }[] = [
  { name: "瓦片列号 x", re: /^Web 墨卡托瓦片方案：经度 -?\d+°、纬度 -?\d+° 在第 \d+ 级的瓦片列号/, keep: 3 },
  { name: "瓦片行号 y", re: /^Web 墨卡托瓦片方案：.*瓦片行号/, keep: 3 },
  { name: "瓦片总数", re: /^瓦片金字塔第 \d+ 级一共有多少块瓦片/, keep: 3 },
  { name: "赤道分辨率", re: /^EPSG:3857 第 \d+ 级在赤道处的地面分辨率/, keep: 3 },
  { name: "左上角经度", re: /^瓦片 z=\d+, x=\d+, y=\d+ 左上角的经度/, keep: 3 },
  { name: "左上角纬度", re: /^瓦片 z=\d+, x=\d+, y=\d+ 左上角的纬度/, keep: 3 },
  { name: "quadkey", re: /^瓦片 z=\d+, x=\d+, y=\d+ 的 Bing quadkey/, keep: 3 },
  { name: "TMS 行号", re: /^同一瓦片（z=\d+, x=\d+, XYZ y=\d+）在 TMS 方案中的行号/, keep: 3 },
];

const raw = JSON.parse(readFileSync(path.join(CONTENT_DIR, FILE), "utf8"));
const parsed = questionFileSchema.parse(raw);

const keptCount = new Map<string, number>();
const kept: typeof parsed.questions = [];
const deletedIds: string[] = [];

for (const q of parsed.questions) {
  const tpl = TEMPLATES.find((t) => t.re.test(q.stem));
  if (!tpl) {
    kept.push(q);
    continue;
  }
  const n = keptCount.get(tpl.name) ?? 0;
  if (n < tpl.keep) {
    keptCount.set(tpl.name, n + 1);
    kept.push(q);
  } else {
    deletedIds.push(q.id);
  }
}

console.log("[prune] 保留 " + kept.length + " 题，删除 " + deletedIds.length + " 题模板克隆题");
for (const t of TEMPLATES) {
  console.log("  - " + t.name + "：保留 " + (keptCount.get(t.name) ?? 0) + " / " + t.keep);
}

if (deletedIds.length > 0) {
  const out = { skill: "gis", module: parsed.module, version: parsed.version + 1, questions: kept };
  questionFileSchema.parse(out);
  writeFileSync(path.join(CONTENT_DIR, FILE), JSON.stringify(out, null, 2) + "\n", "utf8");

  // 记录被删 id（合并旧记录），供 migrate-db-renumber.ts 清理错题记录
  const delPath = path.join(CONTENT_DIR, "renumber-deleted.json");
  let prev: string[] = [];
  if (existsSync(delPath)) {
    try { prev = JSON.parse(readFileSync(delPath, "utf8")); } catch { prev = []; }
  }
  const merged = [...new Set([...prev, ...deletedIds])];
  writeFileSync(delPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
  console.log("[prune] 删除 id 已记录 -> renumber-deleted.json（共 " + merged.length + " 条）");
}
