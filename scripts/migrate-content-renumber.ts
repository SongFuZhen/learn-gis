/**
 * 一次性迁移：旧 8 章 → 新 14 章布局的文件重命名与题目 id 重映射。
 * 映射：05→06、06→13、07→12（其余不变）。
 * 幂等：源文件不存在即视为已完成，跳过。
 * 用法：npx tsx scripts/migrate-content-renumber.ts
 * 产物：content/gis/renumber-map.json（旧题 id → 新题 id），供 DB 迁移脚本使用。
 */
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.resolve(process.cwd(), "content/gis");

/** 旧 module slug → 新 module slug（顺序：先迁走的先执行，避免 05→06 覆盖旧 06） */
const STEPS: { fromSlug: string; toSlug: string; fromFile: string; toFile: string }[] = [
  { fromSlug: "06", toSlug: "13", fromFile: "06-ogc-webmap", toFile: "13-webgis" },
  { fromSlug: "07", toSlug: "12", fromFile: "07-spatial-postgis", toFile: "12-spatial-db" },
  { fromSlug: "05", toSlug: "06", fromFile: "05-formats-tiles", toFile: "06-formats-tiles" },
];

const mapPath = path.join(CONTENT_DIR, "renumber-map.json");
const renumberMap: Record<string, string> = existsSync(mapPath)
  ? JSON.parse(readFileSync(mapPath, "utf8"))
  : {};

for (const step of STEPS) {
  const mdxFrom = path.join(CONTENT_DIR, step.fromFile + ".mdx");
  const jsonFrom = path.join(CONTENT_DIR, step.fromFile + ".questions.json");

  if (!existsSync(mdxFrom) && !existsSync(jsonFrom)) {
    console.log("= 已迁移，跳过 " + step.fromSlug + " -> " + step.toSlug);
    continue;
  }

  if (existsSync(mdxFrom)) {
    renameSync(mdxFrom, path.join(CONTENT_DIR, step.toFile + ".mdx"));
    console.log("> rename " + step.fromFile + ".mdx -> " + step.toFile + ".mdx");
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
        mapped += 1;
      }
      // 每道题自身也带 module 字段，需同步改
      if (q.module === step.fromSlug) q.module = step.toSlug;
    }
    raw.module = step.toSlug;
    const jsonTo = path.join(CONTENT_DIR, step.toFile + ".questions.json");
    writeFileSync(jsonTo, JSON.stringify(raw, null, 2) + "\n", "utf8");
    if (jsonTo !== jsonFrom) deleteOld(jsonFrom);
    console.log(
      "> " + step.fromSlug + " -> " + step.toSlug + "：重映射 " + mapped + " 题 id",
    );
  }
}

function deleteOld(from: string) {
  unlinkSync(from);
  console.log("> 删除旧文件 " + path.basename(from));
}

writeFileSync(mapPath, JSON.stringify(renumberMap, null, 2) + "\n", "utf8");
console.log(
  "[migrate-content-renumber] 完成，映射表 " + Object.keys(renumberMap).length + " 条 -> renumber-map.json",
);
