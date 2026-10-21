// 移动端横向溢出检查：320 / 375 / 390 宽度下 scrollWidth 不得超出视口
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:25000";
const PAGES = ["/", "/s/gis", "/s/gis/01", "/s/gis/01/quiz", "/review", "/progress"];
const WIDTHS = [320, 375, 390];

const browser = await chromium.launch({ channel: "chrome", headless: true });
let bad = 0;

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  for (const path of PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    const overflow = scrollWidth > innerWidth + 1;
    if (overflow) bad += 1;
    console.log(`${overflow ? "✗" : "✓"} ${width}px ${path} (${scrollWidth}px)`);
  }
  await page.close();
}

await browser.close();
console.log(bad === 0 ? "无横向溢出" : `${bad} 处横向溢出`);
process.exit(bad === 0 ? 0 : 1);
