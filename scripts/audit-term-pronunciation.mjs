import fs from "node:fs";
import path from "node:path";

const SKILLS = ["gis", "cesium", "turf", "three", "harmony"];
const TERMS = [
  "Cesium", "WebGL", "GeoJSON", "glTF", "three.js", "PostGIS", "Turf",
  "MapLibre", "Leaflet", "WMS", "WMTS", "WFS", "WCS", "ArkTS", "ArkUI",
  "HarmonyOS", "PBR", "IBL", "3D Tiles", "CZML", "EPSG", "WGS84",
  "GeoPackage", "Shapefile", "MVT", "OGC", "Voronoi",
];

// 真实存在的豁免：产品名、组件名、章节路线图里的带过引用。
const EXEMPT = new Map([
  ["cesium/00-cesium-intro.mdx|3D Tiles", "第 06 章才正式介绍，本章仅路线图带过"],
  ["cesium/00-cesium-intro.mdx|CZML", "第 05 章才正式介绍，本章仅路线图带过"],
  ["three/00-three-intro.mdx|3D Tiles", "地理能力对比表里的带过引用"],
  ["three/00-three-intro.mdx|CZML", "地理能力对比表里的带过引用"],
]);

const CHECK_MISSING = process.argv.includes("--missing");
const isLetter = (ch) => !!ch && /[A-Za-z]/.test(ch);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function mask(line) {
  return line
    .replace(/\x60[^\x60]*\x60/g, (m) => " ".repeat(m.length))
    .replace(/\]\([^)]*\)/g, (m) => " ".repeat(m.length))
    .replace(/https?:\/\/\S+/g, (m) => " ".repeat(m.length));
}

function occurrences(text, term) {
  const out = [];
  let i = 0;
  while ((i = text.indexOf(term, i)) >= 0) {
    const after = text.slice(i + term.length, i + term.length + 6);
    // EPSG:4326 是代码式写法，不算术语正文首现。
    const codeLike = term === "EPSG" && /^:\d/.test(after);
    if (!codeLike && !isLetter(text[i - 1]) && !isLetter(text[i + term.length])) {
      out.push(i);
    }
    i += term.length;
  }
  return out;
}

function hasAnnotation(text, index, term) {
  const after = text.slice(index + term.length, index + term.length + 120);
  const before = text.slice(Math.max(0, index - 8), index);

  // 标准形式：Term（/IPA/，「谐音」）或 **Term**（/IPA/...）
  let ok = /^\*{0,2}\s*（\s*\/[^/\n]{1,60}\//.test(after);

  // 变体：Term 读 /IPA/
  if (!ok) ok = /^\*{0,2}\s*读\s*\/[^/\n]{1,60}\//.test(after);

  // 变体：中文（Term，/IPA/）或 中文（Term 读 /IPA/）
  if (!ok && /（\s*$/.test(before)) {
    ok = /^[，,]?\s*(读\s*)?\/[^/\n]{1,60}\//.test(after);
  }

  // 变体：Turf.js（Turf 读 /IPA/，「谐音」）
  if (!ok) {
    const re = new RegExp(
      "^[^\\n]{0,12}[（，,]\\s*" + escapeRegex(term) + "\\s*读\\s*\\/[^/\\n]{1,60}\\/"
    );
    ok = re.test(after);
  }

  if (!ok) return false;
  return text.slice(index, index + 180).includes("「");
}

function buildProse(rawLines) {
  let inFence = false;
  return rawLines.map((line) => {
    const trimmed = line.trim();
    if (/^(\x60{3}|~{3})/.test(trimmed)) {
      inFence = !inFence;
      return null;
    }
    if (inFence) return null;
    if (trimmed.startsWith("#")) return null;
    if (trimmed.startsWith("<")) return null;
    if (/^\s*[A-Za-z][A-Za-z0-9]*=/.test(line)) return null;
    if (trimmed.startsWith("//")) return null;
    return mask(line);
  });
}

const issues = [];
const exemptHits = [];

for (const skill of SKILLS) {
  const dir = path.join("content", skill);
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".mdx")).sort()) {
    const rel = skill + "/" + name;
    const prose = buildProse(fs.readFileSync(path.join(dir, name), "utf8").split(/\r?\n/));

    for (const term of TERMS) {
      const hits = [];
      prose.forEach((line, i) => {
        if (!line) return;
        for (const idx of occurrences(line, term)) {
          hits.push({ line, idx, lineNo: i + 1 });
        }
      });
      if (!hits.length) continue;

      const first = hits[0];
      if (hasAnnotation(first.line, first.idx, term)) continue;

      const laterOk = hits.slice(1).some((h) => hasAnnotation(h.line, h.idx, term));
      const reason = EXEMPT.get(rel + "|" + term);

      if (reason) {
        exemptHits.push({ rel, term, line: first.lineNo, reason });
      } else if (laterOk) {
        issues.push({ rel, term, line: first.lineNo, kind: "late" });
      } else {
        if (CHECK_MISSING) {
          issues.push({ rel, term, line: first.lineNo, kind: "missing" });
        }
      }
    }
  }
}

for (const e of exemptHits) {
  console.log("豁免 " + e.rel + ":" + e.line + " " + e.term + " — " + e.reason);
}
for (const i of issues) {
  console.log((i.kind === "late" ? "后注" : "缺失") + " " + i.rel + ":" + i.line + " " + i.term);
}
if (issues.length === 0) {
  console.log("OK：没有真实后注问题（豁免 " + exemptHits.length + " 处）");
  if (!CHECK_MISSING) console.log("缺失注音检查默认关闭；需要时加 --missing。");
} else {
  console.log("发现 " + issues.length + " 个真实问题，另有 " + exemptHits.length + " 处豁免");
}
process.exitCode = issues.length === 0 ? 0 : 1;
