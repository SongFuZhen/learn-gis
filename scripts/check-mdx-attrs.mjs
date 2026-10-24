import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("content/gis");
let bad = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".mdx"))) {
  const lines = fs.readFileSync(path.join(dir, f), "utf8").split("\n");
  lines.forEach((line, i) => {
    if (!/^<(Callout|MapExample)/.test(line)) return;
    const quotes = (line.match(/"/g) ?? []).length;
    if (quotes > 4) {
      bad += 1;
      console.log(`${f}:${i + 1} quotes=${quotes} ${line.slice(0, 90)}`);
    }
  });
}
console.log(bad === 0 ? "OK: 所有 Callout/MapExample 属性引号正常" : `发现 ${bad} 行异常`);
