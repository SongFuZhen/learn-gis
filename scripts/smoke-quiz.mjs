// 冒烟验收：真实 Chrome 走完一章（默认 01 章 10 题），全对应得 100% 掌握度。
// 用法：先启动 dev/preview，再 npm run smoke:quiz（BASE_URL 可覆盖）
import { chromium } from "playwright-core";
import questions from "../content/gis/01-basics.questions.json" with { type: "json" };

const BASE = process.env.BASE_URL ?? "http://localhost:25000";
const VIEWPORT = { width: 390, height: 780 };

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: VIEWPORT });

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${BASE}/s/gis/01/quiz`, { waitUntil: "networkidle" });

for (const q of questions.questions) {
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
    console.log(`FAIL ${q.id}`);
    await page.screenshot({ path: "/tmp/fail.png", fullPage: true });
    process.exit(1);
  }
  await page.getByRole("button", { name: /下一题|查看结果/ }).click();
}

await page.getByText(/测验结果/).waitFor();
const main = await page.locator("main").innerText();
const mastery = await page.getByText(/掌握度/).innerText();
console.log("mastery:", mastery.replace(/\s+/g, " ").trim());
console.log("answer line:", main.match(/答对[^\n]*/)?.[0] ?? "(missing)");
await page.screenshot({ path: "/tmp/quiz-result.png", fullPage: true });
console.log("console errors:", errors.length === 0 ? "none" : errors.slice(0, 5));
await browser.close();
