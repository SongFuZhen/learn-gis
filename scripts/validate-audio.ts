// 校验预生成音频：manifest 覆盖 + MP3 结构抽查
// 用法：npx tsx scripts/validate-audio.ts
import { readFileSync, readdirSync, existsSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { extractSpeechSegments } from '../lib/speech/extract';
import type { ChapterManifest } from '../lib/speech/manifest';

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, 'content', 'gis');
const OUT_DIR = join(ROOT, 'public', 'audio');
const HASH_RE = /^[0-9a-f]{16}$/;
const MIN_MP3_BYTES = 1024;
const BITRATE_BPS = 128000 / 8; // 128kbps mono，用于估算时长

interface Check {
  slug: string;
  est: number;        // 从 MDX 现抽的段落数
  segs: number;       // manifest 段数
  mp3: number;        // 实际 mp3 文件数
  bytes: number;
  status: 'OK' | 'PENDING' | 'ERROR';
  issues: string[];
}

function isMp3FrameSync(buf: Buffer): boolean {
  const b0 = buf[0];
  const b1 = buf[1];
  const b2 = buf[2];
  // ID3v2 标签
  if (b0 === 0x49 && b1 === 0x44 && b2 === 0x33) return true;
  // MPEG 音频帧同步：11 位全 1，且 Layer III
  if (b0 === undefined || b1 === undefined) return false;
  if (b0 !== 0xff) return false;
  if ((b1 & 0xe0) !== 0xe0) return false;
  if ((b1 & 0x06) !== 0x02) return false; // Layer III
  return true;
}

function checkChapter(slug: string): Check {
  const issues: string[] = [];
  const mdxPath = join(CONTENT_DIR, slug + '.mdx');
  const est = extractSpeechSegments(readFileSync(mdxPath, 'utf8')).length;
  const dir = join(OUT_DIR, slug);
  const manifestPath = join(dir, 'manifest.json');

  if (!existsSync(manifestPath)) {
    const onDisk = existsSync(dir)
      ? readdirSync(dir).filter((f) => f.endsWith('.mp3')).length
      : 0;
    return { slug, est, segs: 0, mp3: onDisk, bytes: 0, status: 'PENDING', issues: ['manifest 尚未生成（章节仍在处理中，已生成 ' + onDisk + '/' + est + ' 段）'] };
  }

  let m: ChapterManifest;
  try {
    m = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    return { slug, est, segs: 0, mp3: 0, bytes: 0, status: 'ERROR', issues: ['manifest.json 无法解析: ' + (e as Error).message] };
  }

  if (m.slug !== slug) issues.push('slug 不匹配: ' + m.slug);
  if (!m.model) issues.push('缺 model');
  if (!m.generatedAt) issues.push('缺 generatedAt');
  if (!Array.isArray(m.segments)) issues.push('segments 非数组');
  const segs = Array.isArray(m.segments) ? m.segments.length : 0;
  if (m.segmentCount !== segs) issues.push('segmentCount(' + m.segmentCount + ') != segments.length(' + segs + ')');
  if (segs !== est) issues.push('覆盖不一致: manifest ' + segs + ' 段 vs MDX 现抽 ' + est + ' 段（源改动需重跑）');

  const referenced = new Set<string>();
  let bytes = 0;
  let validMp3 = 0;
  if (Array.isArray(m.segments)) {
    for (let i = 0; i < m.segments.length; i++) {
      const s = m.segments[i];
      if (!s) { issues.push('第 ' + i + ' 段为空'); continue; }
      if (s.index !== i) issues.push('第 ' + i + ' 段 index=' + s.index + '（应连续）');
      if (!s.text) issues.push('第 ' + i + ' 段缺 text');
      if (!HASH_RE.test(s.hash)) issues.push('第 ' + i + ' 段 hash 非法: ' + s.hash);
      const expected = 'seg' + String(i).padStart(2, '0') + '.mp3';
      if (s.audio !== expected) issues.push('第 ' + i + ' 段 audio=' + s.audio + '（应为 ' + expected + '）');
      referenced.add(s.audio);
      const p = join(dir, s.audio);
      if (!existsSync(p)) { issues.push('缺音频文件 ' + s.audio); continue; }
      const size = statSync(p).size;
      bytes += size;
      if (size < MIN_MP3_BYTES) { issues.push(s.audio + ' 过小 (' + size + 'B)'); continue; }
      const buf = Buffer.alloc(4);
      const fd = openSync(p, 'r');
      readSync(fd, buf, 0, 4, 0);
      closeSync(fd);
      if (!isMp3FrameSync(buf)) issues.push(s.audio + ' MP3 帧头非法: ' + buf.toString('hex'));
      else validMp3++;
    }
  }

  // 孤立 mp3（未被 manifest 引用）
  const orphans = readdirSync(dir).filter((f) => f.endsWith('.mp3') && !referenced.has(f));
  if (orphans.length) issues.push('孤立 mp3: ' + orphans.join(', '));

  return { slug, est, segs, mp3: validMp3, bytes, status: issues.length ? 'ERROR' : 'OK', issues };
}

function main() {
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx')).sort();
  const slugs = files.map((f) => f.replace(/\.mdx$/, ''));
  const results: Check[] = slugs.map(checkChapter);

  console.log('chapter                est   manifest   mp3   status');
  for (const r of results) {
    console.log(
      r.slug.padEnd(22) +
      String(r.est).padStart(4) +
      '   ' + String(r.segs).padStart(8) +
      '   ' + String(r.mp3).padStart(5) +
      '   ' + r.status,
    );
    for (const i of r.issues) console.log('    ! ' + i);
  }

  const ok = results.filter((r) => r.status === 'OK');
  const pending = results.filter((r) => r.status === 'PENDING');
  const err = results.filter((r) => r.status === 'ERROR');
  const totalBytes = results.reduce((a, r) => a + r.bytes, 0);
  const totalSegs = ok.reduce((a, r) => a + r.segs, 0);
  const estSec = totalBytes / BITRATE_BPS;
  console.log('------------------------------------------------------------');
  console.log('章节: OK=' + ok.length + '  PENDING=' + pending.length + '  ERROR=' + err.length + ' / ' + results.length);
  console.log('已校验音频: ' + totalSegs + ' 段, ' + (totalBytes / 1024 / 1024).toFixed(1) + ' MB, 估算时长 ~' + Math.round(estSec / 60) + ' 分钟');
  if (err.length) {
    console.log('存在 ERROR，见上方 ! 行');
    process.exitCode = 1;
  } else if (pending.length) {
    console.log('无 ERROR；PENDING 章节仍在生成中（全量批次未结束）。');
  } else {
    console.log('全部章节覆盖完整、MP3 结构校验通过。');
  }
}

main();
