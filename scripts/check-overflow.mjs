// 移动端横向溢出检查：320 / 375 / 390 宽度下 scrollWidth 不得超出视口
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:25000";
const CONTENT_DIR = path.resolve(process.cwd(), "content/gis");

const modules = readdirSync(CONTENT_DIR)
  .filter((f) => f.endsWith(".questions.json"))
  .map((f) => JSON.parse(readFileSync(path.join(CONTENT_DIR, f), "utf8")).module)
  .sort();

const PAGES = [
  "/",
  "/s/gis",
  "/review",
  "/progress",
  ...modules.flatMap((m) => [`/s/gis/${m}`, `/s/gis/${m}/quiz`]),
];
const WIDTHS = [320, 375, 390];

const browser = await chromium.launch({ channel: "chrome", headless: true });
let bad = 0;

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  for (const p of PAGES) {
    await page.goto(`${BASE}${p}`, { waitUntil: "networkidle" });
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
