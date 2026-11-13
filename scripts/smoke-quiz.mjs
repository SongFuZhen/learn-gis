// 冒烟验收：真实 Chrome 把每章题库全做一遍（全对 → 100% 掌握度），
// 再把「每日一考 / 综合考试」两套随机卷按题干反查题库做一遍。
// 用法：先 `npm run dev`，再 `npm run smoke:quiz`（BASE_URL / MODULE / SKILL / SKIP_EXAM 可覆盖）
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:25000";
const ONLY = process.env.MODULE ?? null;
const SKILL_FILTER = process.env.SKILL ?? null;
const SKIP_EXAM = process.env.SKIP_EXAM === "1";
const CONTENT_ROOT = path.resolve(process.cwd(), "content");
const loadBanks = (dir) =>
  readdirSync(path.join(CONTENT_ROOT, dir))
    .filter((f) => f.endsWith(".questions.json"))
    .sort()
    .map((file) => ({
      ...JSON.parse(readFileSync(path.join(CONTENT_ROOT, dir, file), "utf8")),
      skill: dir,
    }));

// 枚举 content/ 下全部含题库的技能目录；SKILL=<id> 可限定单门课。
// 考试题库是全站合并（见 content/all-questions.ts），反查表需覆盖全部 skill。
const skillDirs = readdirSync(CONTENT_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((dir) => {
    if (SKILL_FILTER && dir !== SKILL_FILTER) return false;
    return readdirSync(path.join(CONTENT_ROOT, dir)).some((f) =>
      f.endsWith(".questions.json"),
    );
  })
  .sort();
const chapterBanks = skillDirs.flatMap(loadBanks);
const banks = chapterBanks;
console.log(
  `技能目录：${skillDirs.join(", ")}；章节题库 ${chapterBanks.length} 个`,
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
  } else if (q.type === "numeric") {
    await page.locator("#numeric-answer").fill(String(q.answer));
  } else if (q.type === "truefalse") {
    await page
      .getByRole("button", { name: q.answer ? "对" : "错", exact: true })
      .click();
  } else if (q.type === "map") {
    // 等动态加载的 MapPicker 挂好测试钩子
    await page.waitForFunction(() => Boolean(window.__quizMap), null, { timeout: 30000 });
    // 在目标坐标触发地图 click（容差 220km+，精确命中必答对）
    await page.evaluate((t) => {
      const map = window.__quizMap;
      const latlng = map.containerPointToLatLng(
        map.latLngToContainerPoint([t.lat, t.lng]),
      );
      map.fire("click", { latlng });
    }, q.target);
  } else {
    for (const key of q.answer) {
      await page
        .getByRole("button", { name: new RegExp(`^${key}\\b`) })
        .click();
    }
  }
  await page.getByRole("button", { name: "提交答案", exact: true }).click();
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
for (const bank of chapterBanks) {
  if (ONLY && bank.module !== ONLY) continue;

  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE}/s/${bank.skill}/${bank.module}/quiz`, {
    waitUntil: "networkidle",
  });

  for (const q of bank.questions) {
    await page.getByRole("heading", { level: 2 }).waitFor();
    await answerOne(page, q, `${bank.skill}/${bank.module}`);
  }

  await page.getByText(/测验结果/).waitFor();
  const answerLine = (await page.locator("main").innerText()).match(/答对[^\n]*/)?.[0];
  console.log(
    `${failed === 0 ? "✓" : "✗"} ${bank.skill}/${bank.module} · ${bank.questions.length} 题 · ${answerLine ?? ""} · console 错误 ${errors.length}`,
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
      // 未命中时无法作答，提交按钮处于 disabled；跳过按钮始终可点，用它推进流程
      await page.getByRole("button", { name: /不知道，跳过/ }).click();
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

// 3) 跳过专项：第一章第一题点「不知道，跳过」，校验反馈/结果统计/错题标签
{
  const bank = banks[0];
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE}/s/${bank.skill}/${bank.module}/quiz`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 2 }).waitFor();

  await page.getByRole("button", { name: /不知道，跳过/ }).click();
  const skipVerdict = page.getByText("这道题跳过了，记住它").first();
  await skipVerdict.waitFor();
  totalQuestions += 1;

  // 跳过题在错题列表带「跳过」标签，结果统计行出现「跳过 1」
  await page.getByRole("button", { name: /下一题|查看结果/ }).click();

  // 一章有多题：跳过首题后把剩余题答完，才会进入结果页
  for (let i = 1; i < bank.questions.length; i += 1) {
    const heading = page.getByRole("heading", { level: 2 }).first();
    if (!(await heading.isVisible().catch(() => false))) break;
    const stem = (await heading.innerText()).trim();
    const q = stemMap.get(stem);
    if (!q) {
      await page.getByRole("button", { name: /不知道，跳过/ }).click();
      await page.getByRole("button", { name: /下一题|查看结果/ }).click();
      continue;
    }
    await answerOne(page, q, "跳过专项");
  }
  await page.getByText(/测验结果/).waitFor();
  const mainText = await page.locator("main").innerText();
  if (!/跳过\s*1/.test(mainText)) {
    failed += 1;
    console.log("✗ 跳过专项：结果页缺少「跳过 1」统计");
  }
  if (errors.length > 0) {
    failed += 1;
    console.log("✗ 跳过专项：console 错误", errors.slice(0, 3));
  } else {
    console.log("✓ 跳过专项：反馈/统计/标签均正确 · console 错误 0");
  }
  await page.close();
}

await browser.close();
console.log(
  `总计 ${totalQuestions} 题，失败 ${failed} 题${failed === 0 ? "，全部通过" : ""}`,
);
process.exit(failed === 0 ? 0 : 1);
