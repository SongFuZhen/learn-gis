/**
 * 批次 1 追加题库：02-projection（补投影家族/变形题）+ 01-basics（补高程/基准转换/GCJ-02 题）。
 * 幂等性：按目标总数判断，已达目标即跳过；每题过 questionSchema，坏数据即抛错。
 * 用法：npx tsx scripts/gen-questions-batch1.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { questionFileSchema, questionSchema } from "../content/schema";
import { gen02Projection, gen01Extra } from "./gen-banks/batch1";

const CONTENT_DIR = path.resolve(process.cwd(), "content/gis");

const JOBS: {
  file: string;
  module: string;
  target: number;
  produced: () => object[];
}[] = [
  { file: "02-projection", module: "02", target: 120, produced: gen02Projection },
  { file: "01-basics", module: "01", target: 140, produced: gen01Extra },
];

let grand = 0;

for (const job of JOBS) {
  const full = path.join(CONTENT_DIR, job.file + ".questions.json");
  const raw = JSON.parse(readFileSync(full, "utf8"));
  const parsed = questionFileSchema.parse(raw);
  const existing = parsed.questions;

  if (existing.length >= job.target) {
    console.log("= " + job.file + "：已有 " + existing.length + " 题 ≥ 目标 " + job.target + "，跳过");
    grand += existing.length;
    continue;
  }

  // 起始序号：接在现有最大序号之后
  const prefix = "gis-" + job.module + "-";
  let maxSeq = 0;
  for (const q of existing) {
    if (q.id.startsWith(prefix)) {
      const n = Number(q.id.slice(prefix.length));
      if (Number.isInteger(n) && n > maxSeq) maxSeq = n;
    }
  }

  const seenStems = new Set(existing.map((q) => q.stem));
  const produced = job.produced().filter((q) => {
    const stem = (q as { stem: string }).stem;
    if (seenStems.has(stem)) return false;
    seenStems.add(stem);
    return true;
  });

  const bank: object[] = existing.map((q) => q as unknown as object);
  produced.forEach((q, i) => {
    const id = prefix + String(maxSeq + 1 + i).padStart(3, "0");
    const withId = { id, ...(q as Record<string, unknown>) };
    const check = questionSchema.safeParse(withId);
    if (!check.success) {
      const issues = check.error.issues
        .map((iss) => iss.path.join(".") + ": " + iss.message)
        .join("; ");
      throw new Error(
        "生成题校验失败 " + job.file + " [" + id + "]: " + issues +
        "\n" + JSON.stringify(withId).slice(0, 400),
      );
    }
    bank.push(withId);
  });

  const out = {
    skill: "gis",
    module: job.module,
    version: parsed.version + 1,
    questions: bank,
  };
  questionFileSchema.parse(out);
  writeFileSync(full, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log("+ " + job.file + "：" + existing.length + " → " + bank.length + " 题（新增 " + produced.length + "）");
  grand += bank.length;
}

console.log("[gen-questions-batch1] 总题数：" + grand);
