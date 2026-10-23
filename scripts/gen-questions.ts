/**
 * 题库批量生成：参数化计算题 + 人工出题池，追加写入各模块 questions.json。
 * 用法：npx tsx scripts/gen-questions.ts
 * 幂等性：每模块题目数达到目标即跳过；生成器种子固定，重跑产出一致。
 * 产物需提交进仓库（next build 直接 import JSON）。
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { questionFileSchema, questionSchema } from "../content/schema";
import { rngFor } from "./gen-banks/helpers";
import { gen00 } from "./gen-banks/m00";
import { gen01 } from "./gen-banks/m01";
import { gen02 } from "./gen-banks/m02";
import { gen03 } from "./gen-banks/m03";
import { gen04 } from "./gen-banks/m04";
import { gen05 } from "./gen-banks/m05";
import { gen06 } from "./gen-banks/m06";

const CONTENT_DIR = path.resolve(process.cwd(), "content/gis");

/** 每模块的目标总题数（含已有人工题） */
const TARGETS: Record<string, { file: string; target: number }> = {
  "00": { file: "00-geo-math", target: 161 },
  "01": { file: "01-basics", target: 120 },
  "02": { file: "02-crs-epsg", target: 149 },
  "03": { file: "03-vector-raster", target: 145 },
  "04": { file: "04-formats-tiles", target: 225 },
  "05": { file: "05-ogc-webmap", target: 134 },
  "06": { file: "06-spatial-postgis", target: 165 },
};

const GENERATORS: Record<string, (count: number, r: () => number) => object[]> = {
  "00": gen00,
  "01": (n) => gen01(n),
  "02": gen02,
  "03": gen03,
  "04": gen04,
  "05": gen05,
  "06": gen06,
};

function maxSeq(ids: string[], prefix: string): number {
  let max = 0;
  for (const id of ids) {
    if (id.startsWith(prefix)) {
      const n = Number(id.slice(prefix.length));
      if (Number.isInteger(n) && n > max) max = n;
    }
  }
  return max;
}

let grandTotal = 0;

for (const [mod, { file, target }] of Object.entries(TARGETS)) {
  const full = path.join(CONTENT_DIR, file + ".questions.json");
  const raw = JSON.parse(readFileSync(full, "utf8"));
  const parsed = questionFileSchema.parse(raw);
  const existing = parsed.questions;

  if (existing.length >= target) {
    console.log(
      "= " + file + "：已有 " + existing.length + " 题，达到目标 " + target + "，跳过",
    );
    grandTotal += existing.length;
    continue;
  }

  const needs = target - existing.length;
  const prefix = "gis-" + mod + "-";
  const startSeq = maxSeq(
    existing.map((q) => q.id),
    prefix,
  );

  const producedAll = GENERATORS[mod]!(needs, rngFor(mod));
  if (producedAll.length === 0) throw new Error("生成器未产出任何题目：" + mod);

  // 按题干去重：与库内已有题干或本批重复的题丢弃（同参数重复抽取时出现）
  const seenStems = new Set(existing.map((q) => q.stem));
  const produced = producedAll.filter((q) => {
    const stem = (q as { stem: string }).stem;
    if (seenStems.has(stem)) return false;
    seenStems.add(stem);
    return true;
  });
  const dropped = producedAll.length - produced.length;
  if (dropped > 0) {
    console.log(
      "- " + file + "：丢弃重复题干 " + dropped + " 题",
    );
  }

  const bank: object[] = existing.map((q) => q as unknown as object);

  produced.forEach((q, i) => {
    const id = prefix + String(startSeq + 1 + i).padStart(3, "0");
    const withId = { id, ...(q as Record<string, unknown>) };
    const check = questionSchema.safeParse(withId);
    if (!check.success) {
      const issues = check.error.issues
        .map((iss) => iss.path.join(".") + ": " + iss.message)
        .join("; ");
      throw new Error(
        "生成题校验失败 " + file + " [" + id + "]: " + issues +
        "\n" + JSON.stringify(withId).slice(0, 400),
      );
    }
    bank.push(withId);
  });

  const out = {
    skill: "gis",
    module: mod,
    version: (parsed as unknown as { version: number }).version + 1,
    questions: bank,
  };
  questionFileSchema.parse(out);
  writeFileSync(full, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(
    "+ " + file + "：新增 " + produced.length + " 题（" + existing.length + " → " + bank.length + "）",
  );
  grandTotal += bank.length;
}

console.log("[gen-questions] 全库总题数：" + grandTotal);
