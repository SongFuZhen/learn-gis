// 移动端横向溢出检查：320 / 375 / 390 宽度下 scrollWidth 不得超出视口
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:25000";
const SKILL_FILTER = process.env.SKILL ?? null;
const CONTENT_ROOT = path.resolve(process.cwd(), "content");

// 枚举 content/ 下全部含题库的技能目录；SKILL=<id> 可限定单门课
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

const skillPages = skillDirs.flatMap((skill) => {
  const modules = readdirSync(path.join(CONTENT_ROOT, skill))
    .filter((f) => f.endsWith(".questions.json"))
    .map((f) =>
      JSON.parse(readFileSync(path.join(CONTENT_ROOT, skill, f), "utf8")).module,
    )
    .sort();
  return [
    `/s/${skill}`,
    ...modules.flatMap((m) => [`/s/${skill}/${m}`, `/s/${skill}/${m}/quiz`]),
  ];
});

const PAGES = ["/", "/learn", "/review", "/progress", ...skillPages];
const WIDTHS = [320, 375, 390];

const browser = await chromium.launch({ channel: "chrome", headless: true });
let bad = 0;

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  for (const p of PAGES) {
    await page.goto(`${BASE}${p}`, { waitUntil: "load" });
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    const overflow = scrollWidth > innerWidth + 1;
    if (overflow) bad += 1;
    console.log(`${overflow ? "✗" : "✓"} ${width}px ${p} (${scrollWidth}px)`);
  }
  await page.close();
}

await browser.close();
console.log(bad === 0 ? "无横向溢出" : `${bad} 处横向溢出`);
process.exit(bad === 0 ? 0 : 1);
