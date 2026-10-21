// 冒烟验收：真实 Chrome 把每章题库全做一遍，全对应得 100% 掌握度。
// 用法：先 `npm run dev`，再 `npm run smoke:quiz`（BASE_URL / MODULE 可覆盖）
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:25000";
const ONLY = process.env.MODULE ?? null;
const CONTENT_DIR = path.resolve(process.cwd(), "content/gis");

const files = readdirSync(CONTENT_DIR)
  .filter((f) => f.endsWith(".questions.json"))
  .sort();

const browser = await chromium.launch({ channel: "chrome", headless: true });
let failed = 0;
let totalQuestions = 0;

for (const file of files) {
  const bank = JSON.parse(readFileSync(path.join(CONTENT_DIR, file), "utf8"));
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
    totalQuestions += 1;
    await page.getByRole("heading", { level: 2 }).waitFor();

    if (q.type === "short") {
      await page.locator("#short-answer").fill(q.accepted[0]);
    } else {
      for (const key of q.answer) {
        await page.getByRole("button", { name: new RegExp(`^${key}\\b`) }).click();
      }
    }

    await page.getByRole("button", { name: /提交/ }).click();
    const verdict = page.getByText(/答对了|答错了/).first();
    await verdict.waitFor();
    if (!(await verdict.innerText()).includes("答对了")) {
      failed += 1;
      console.log(`✗ ${bank.module} ${q.id}`);
      await page.screenshot({ path: `/tmp/fail-${q.id}.png`, fullPage: true });
    }
    await page.getByRole("button", { name: /下一题|查看结果/ }).click();
  }

  await page.getByText(/测验结果/).waitFor();
  const answerLine = (await page.locator("main").innerText()).match(/答对[^\n]*/)?.[0];
  console.log(
    `${failed === 0 ? "✓" : "✗"} 第 ${bank.module} 章 · ${bank.questions.length} 题 · ${answerLine ?? ""} · console 错误 ${errors.length}`,
  );
  if (errors.length > 0) console.log("  errors:", errors.slice(0, 3));
  await page.close();
}

await browser.close();
console.log(
  `总计 ${totalQuestions} 题，失败 ${failed} 题${failed === 0 ? "，全部通过" : ""}`,
);
process.exit(failed === 0 ? 0 : 1);
