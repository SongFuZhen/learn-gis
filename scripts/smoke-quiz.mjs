// 冒烟验收：真实 Chrome 把每章题库全做一遍（全对 → 100% 掌握度），
// 再把「每日一考 / 综合考试」两套随机卷按题干反查题库做一遍。
// 用法：先 `npm run dev`，再 `npm run smoke:quiz`（BASE_URL / MODULE / SKIP_EXAM 可覆盖）
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:25000";
const ONLY = process.env.MODULE ?? null;
const SKIP_EXAM = process.env.SKIP_EXAM === "1";
const CONTENT_DIR = path.resolve(process.cwd(), "content/gis");

const files = readdirSync(CONTENT_DIR)
  .filter((f) => f.endsWith(".questions.json"))
  .sort();
const banks = files.map((file) =>
  JSON.parse(readFileSync(path.join(CONTENT_DIR, file), "utf8")),
);
const stemMap = new Map();
for (const bank of banks) {
  for (const q of bank.questions) stemMap.set(q.stem, q);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
let failed = 0;
let totalQuestions = 0;

/** 在真实页面里答一道题并校验判卷结果 */
async function answerOne(page, q, context) {
  totalQuestions += 1;
  if (q.type === "short") {
    await page.locator("#short-answer").fill(q.accepted[0]);
  } else {
    for (const key of q.answer) {
      await page
        .getByRole("button", { name: new RegExp(`^${key}\\b`) })
        .click();
    }
  }
  await page.getByRole("button", { name: /提交/ }).click();
  const verdict = page.getByText(/答对了|答错了/).first();
  await verdict.waitFor();
  if (!(await verdict.innerText()).includes("答对了")) {
    failed += 1;
    console.log(`✗ ${context} ${q.id}`);
    await page.screenshot({ path: `/tmp/fail-${q.id}.png`, fullPage: true });
  }
  await page.getByRole("button", { name: /下一题|查看结果/ }).click();
}

// 1) 章节测验：按题库顺序逐题作答
for (const bank of banks) {
  if (ONLY && bank.module !== ONLY) continue;

  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE}/s/gis/${bank.module}/quiz`, {
    waitUntil: "networkidle",
  });

  for (const q of bank.questions) {
    await page.getByRole("heading", { level: 2 }).waitFor();
    await answerOne(page, q, `第 ${bank.module} 章`);
  }

  await page.getByText(/测验结果/).waitFor();
  const answerLine = (await page.locator("main").innerText()).match(/答对[^\n]*/)?.[0];
  console.log(
    `${failed === 0 ? "✓" : "✗"} 第 ${bank.module} 章 · ${bank.questions.length} 题 · ${answerLine ?? ""} · console 错误 ${errors.length}`,
  );
  if (errors.length > 0) console.log("  errors:", errors.slice(0, 3));
  await page.close();
}

// 2) 考试：题序随机，按题干反查题库作答
const EXAMS = [
  { name: "每日一考", path: "/exam/daily", size: 10 },
  { name: "综合考试", path: "/exam/mock", size: 25 },
];

for (const exam of EXAMS) {
  if (ONLY || SKIP_EXAM) continue;

  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE}${exam.path}`, { waitUntil: "networkidle" });

  let missed = 0;
  for (let i = 0; i < exam.size; i += 1) {
    const heading = page.getByRole("heading", { level: 2 }).first();
    await heading.waitFor();
    const stem = (await heading.innerText()).trim();
    const q = stemMap.get(stem);
    if (!q) {
      missed += 1;
      failed += 1;
      totalQuestions += 1;
      console.log(`✗ ${exam.name} 题干未命中题库：${stem.slice(0, 40)}`);
      await page.getByRole("button", { name: /提交/ }).click();
      await page.getByRole("button", { name: /下一题|查看结果/ }).click();
      continue;
    }
    await answerOne(page, q, exam.name);
  }

  await page.getByText(/考试结果/).waitFor();
  const answerLine = (await page.locator("main").innerText()).match(/答对[^\n]*/)?.[0];
  console.log(
    `${missed === 0 && failed === 0 ? "✓" : "✗"} ${exam.name} · ${exam.size} 题 · ${answerLine ?? ""} · console 错误 ${errors.length}`,
  );
  if (errors.length > 0) console.log("  errors:", errors.slice(0, 3));
  await page.close();
}

await browser.close();
console.log(
  `总计 ${totalQuestions} 题，失败 ${failed} 题${failed === 0 ? "，全部通过" : ""}`,
);
process.exit(failed === 0 ? 0 : 1);
