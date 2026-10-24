/**
 * 批次 6 题库：11-remote-sensing（全新 120 题）+ 13-webgis（实战补充 8 题）。
 * 用法：npx tsx scripts/gen-questions-batch6.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { questionFileSchema, questionSchema } from "../content/schema";
import { gen11RemoteSensing, gen13WebgisExtra } from "./gen-banks/batch6";

const CONTENT_DIR = path.resolve(process.cwd(), "content/gis");
const JOBS = [
  { file: "11-remote-sensing", module: "11", target: 120, produced: gen11RemoteSensing },
  { file: "13-webgis", module: "13", target: 141, produced: gen13WebgisExtra },
];

let grand = 0;
for (const job of JOBS) {
  const full = path.join(CONTENT_DIR, job.file + ".questions.json");
  const exists = existsSync(full);
  const raw = exists ? JSON.parse(readFileSync(full, "utf8")) : null;
  const parsed = raw ? questionFileSchema.parse(raw) : null;
  const existing = parsed ? parsed.questions : [];

  if (existing.length >= job.target) {
    console.log("= " + job.file + "：已有 " + existing.length + " 题 ≥ 目标 " + job.target + "，跳过");
    grand += existing.length;
    continue;
  }

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
    version: (parsed ? parsed.version : 0) + 1,
    questions: bank,
  };
  questionFileSchema.parse(out);
  writeFileSync(full, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log("+ " + job.file + "：" + existing.length + " → " + bank.length + " 题（新增 " + produced.length + "）");
  grand += bank.length;
}
console.log("[gen-questions-batch6] 总题数：" + grand);
