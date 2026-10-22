import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

/**
 * 品牌图标流水线：把白底的源图（scripts/assets/gis-logo.png）
 * 去底 → 裁到图形边界 → 导出 app 图标 / apple 图标 / favicon.ico / UI logo。
 *
 * 用法：npm run icons
 * 产物：
 *   app/icon.png         256×256（Next 图标约定）
 *   app/apple-icon.png   180×180
 *   app/favicon.ico      16/32/48（PNG 编码条目）
 *   public/brand/logo.png 128×128（站内 logo，透明底）
 */
const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "scripts/assets/gis-logo.png");

/** 把 PNG 的 base64 数据打包成 ICO（PNG 条目，Vista+ 主流浏览器均支持） */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

const b64 = readFileSync(SOURCE).toString("base64");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
await page.goto(process.env.BASE_URL ?? "about:blank");

const result = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = `data:image/png;base64,${b64}`;
  await img.decode();

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const sctx = src.getContext("2d");
  sctx.drawImage(img, 0, 0);
  const px = sctx.getImageData(0, 0, w, h);
  const d = px.data;

  // 1) 从四边泛洪，把「与外界连通的浅色」变成透明（图形内部的白色负形保留）
  const LIMIT = 215; // 三通道都 >= LIMIT 视作背景
  const isBg = (x, y) => {
    const i = (y * w + x) * 4;
    return d[i] >= LIMIT && d[i + 1] >= LIMIT && d[i + 2] >= LIMIT;
  };
  const visited = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) {
    stack.push([x, 0], [x, h - 1]);
  }
  for (let y = 0; y < h; y++) {
    stack.push([0, y], [w - 1, y]);
  }
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const k = y * w + x;
    if (visited[k]) continue;
    if (!isBg(x, y)) continue;
    visited[k] = 1;
    d[k * 4 + 3] = 0;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  sctx.putImageData(px, 0, 0);

  // 2) 裁到不透明像素边界（留 1px 安全边）
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const pad = 1;
  const cx = Math.max(0, minX - pad);
  const cy = Math.max(0, minY - pad);
  const cw = Math.min(w, maxX + pad + 1) - cx;
  const ch = Math.min(h, maxY + pad + 1) - cy;

  // 3) 导出：先渲到正方形画布（避免非等比拉伸）
  const render = (size) => {
    const out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    const ctx = out.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const scale = Math.min(size / cw, size / ch);
    const dw = cw * scale;
    const dh = ch * scale;
    ctx.drawImage(src, cx, cy, cw, ch, (size - dw) / 2, (size - dh) / 2, dw, dh);
    return out.toDataURL("image/png");
  };

  return {
    crop: { cx, cy, cw, ch },
    png: {
      16: render(16),
      32: render(32),
      48: render(48),
      128: render(128),
      180: render(180),
      256: render(256),
    },
  };
}, b64);

await browser.close();

const toBuffer = (dataUrl) => Buffer.from(dataUrl.split(",")[1], "base64");

mkdirSync(path.join(ROOT, "public/brand"), { recursive: true });
writeFileSync(path.join(ROOT, "public/brand/logo.png"), toBuffer(result.png[128]));
writeFileSync(path.join(ROOT, "app/icon.png"), toBuffer(result.png[256]));
writeFileSync(path.join(ROOT, "app/apple-icon.png"), toBuffer(result.png[180]));
writeFileSync(
  path.join(ROOT, "app/favicon.ico"),
  buildIco(
    [16, 32, 48].map((size) => ({ size, png: toBuffer(result.png[size]) })),
  ),
);

console.log("[icons] crop", result.crop);
console.log("[icons] app/icon.png app/apple-icon.png app/favicon.ico public/brand/logo.png");
