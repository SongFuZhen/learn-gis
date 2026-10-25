// 按文件+行号修正重编号后的过期章节引用（一次性脚本）
import { readFileSync, writeFileSync } from "node:fs";

const FIXES = {
  "content/gis/03-projection.mdx": { 56: [3, 4], 137: [4, 7] },
  "content/gis/05-vector-raster.mdx": {},
  "content/gis/06-cartography.mdx": { 157: [2, 3] },
  "content/gis/08-gis-tools.mdx": { 125: [2, 3] },
  "content/gis/09-data-quality.mdx": { 47: [1, 2], 58: [4, 5] },
  "content/gis/10-spatial-analysis.mdx": { 159: [5, 6] },
  "content/gis/11-terrain.mdx": { 47: [1, 2], 52: [4, 5] },
  "content/gis/12-remote-sensing.mdx": { 44: [6, 7], 83: [8, 9] },
  "content/gis/13-spatial-db.mdx": { 86: [9, 10], 114: [4, 5] },
  "content/gis/14-webgis.mdx": { 157: [6, 7] },
  "content/gis/03-projection.questions.json": { 1816: [3, 4] },
  "content/gis/05-vector-raster.questions.json": {},
  "content/gis/08-gis-tools.questions.json": { 332: [4, 5], 1708: [5, 6] },
  "content/gis/09-data-quality.questions.json": { 268: [4, 5], 1504: [1, 2], 2062: [4, 5] },
  "content/gis/10-spatial-analysis.questions.json": { 1492: [5, 6] },
  "content/gis/12-remote-sensing.questions.json": { 1092: [8, 9], 1812: [6, 7] },
};

let applied = 0;
const failed = [];
for (const [file, lines] of Object.entries(FIXES)) {
  const all = readFileSync(file, "utf8").split("\n");
  for (const [lineStr, pair] of Object.entries(lines)) {
    const i = Number(lineStr) - 1;
    const pat = new RegExp("第\\s*0?" + pair[0] + "\\s*章");
    if (!pat.test(all[i])) { failed.push(file + ":" + lineStr); continue; }
    const nn = pair[1] < 10 ? "0" + pair[1] : String(pair[1]);
    all[i] = all[i].replace(pat, "第 " + nn + " 章");
    applied++;
  }
  writeFileSync(file, all.join("\n"));
}
console.log("applied:", applied, "failed:", failed.length);
failed.forEach((f) => console.log("  MISS " + f));
