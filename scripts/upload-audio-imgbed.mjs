// 批量上传章节音频到 CloudFlare ImgBed（cfr2 渠道），并把返回 URL 回写进 manifest 的 publicUrl。
// 用法：node scripts/upload-audio-imgbed.mjs [slug...]
// 环境变量：
//   IMGBED_URL / IMGBED_API_TOKEN  必填
//   MP3_ROOT    mp3 源目录（默认 <cwd>/public/audio；mp3 被 gitignore，本机在主仓库）
//   MANIFEST_ROOT  manifest 所在目录（默认 <cwd>/public/audio）
//   CONCURRENCY 并发数（默认 4）
// 幂等：manifest 里已带 publicUrl 的段自动跳过，可断点续传。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = process.cwd();
const MP3_ROOT = process.env.MP3_ROOT || join(ROOT, 'public', 'audio');
const MANIFEST_ROOT = process.env.MANIFEST_ROOT || join(ROOT, 'public', 'audio');
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY) || 4);
const CHANNEL = process.env.UPLOAD_CHANNEL || 'cfr2';
const FOLDER = 'gis';
const { IMGBED_URL, IMGBED_API_TOKEN } = process.env;
if (!IMGBED_URL || !IMGBED_API_TOKEN) {
  console.error('缺 IMGBED_URL / IMGBED_API_TOKEN 环境变量');
  process.exit(1);
}

// 上传单个文件，返回绝对 URL；失败重试 2 次
async function uploadOne(path, name, attempt = 0) {
  const fd = new FormData();
  fd.append('file', new Blob([readFileSync(path)], { type: 'audio/mpeg' }), name);
  const res = await fetch(
    `${IMGBED_URL}/upload?uploadChannel=${CHANNEL}&uploadFolder=${FOLDER}`,
    { method: 'POST', headers: { Authorization: `Bearer ${IMGBED_API_TOKEN}` }, body: fd },
  );
  if (!res.ok) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
      return uploadOne(path, name, attempt + 1);
    }
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`);
  }
  const data = await res.json();
  const src = Array.isArray(data) ? data[0]?.src : data?.src;
  if (!src) throw new Error('响应无 src: ' + JSON.stringify(data).slice(0, 120));
  return IMGBED_URL.replace(/\/$/, '') + src;
}

// 有界并发
async function runPool(jobs, worker) {
  let cursor = 0;
  let done = 0;
  const total = jobs.length;
  async function w() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      await worker(job);
      done++;
      if (done % 20 === 0 || done === total)
        console.log(`  进度 ${done}/${total}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, w));
}

async function main() {
  const only = process.argv.slice(2);
  const chapters = [];
  const dirs = (await import('node:fs')).readdirSync(MANIFEST_ROOT, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    if (only.length && !only.includes(d.name)) continue;
    const mf = join(MANIFEST_ROOT, d.name, 'manifest.json');
    if (existsSync(mf)) chapters.push({ slug: d.name, path: mf });
  }
  if (!chapters.length) {
    console.error('未找到章节 manifest：' + MANIFEST_ROOT);
    process.exit(1);
  }

  // 收集任务
  const tasks = [];
  for (const ch of chapters) {
    const m = JSON.parse(readFileSync(ch.path, 'utf8'));
    for (const seg of m.segments) {
      if (seg.publicUrl) continue;
      const mp3 = join(MP3_ROOT, ch.slug, seg.audio);
      if (!existsSync(mp3)) {
        console.error(`缺 mp3：${ch.slug}/${seg.audio}，跳过该段`);
        continue;
      }
      tasks.push({
        slug: ch.slug,
        seg,
        mp3,
        name: `${ch.slug}-${basename(seg.audio, '.mp3')}.mp3`,
        manifestPath: ch.path,
      });
    }
  }
  const skipped = chapters.reduce((n, ch) => {
    const m = JSON.parse(readFileSync(ch.path, 'utf8'));
    return n + m.segments.filter((s) => s.publicUrl).length;
  }, 0);
  console.log(`待上传 ${tasks.length} 段（已带 publicUrl 跳过 ${skipped} 段），并发 ${CONCURRENCY}，渠道 ${CHANNEL}`);

  const errors = [];
  const byManifest = new Map(); // manifestPath -> [ {seg, url} ]
  await runPool(tasks, async (t) => {
    try {
      const url = await uploadOne(t.mp3, t.name);
      if (!byManifest.has(t.manifestPath)) byManifest.set(t.manifestPath, []);
      byManifest.get(t.manifestPath).push({ seg: t.seg, url });
    } catch (e) {
      errors.push(`${t.slug}/${t.seg.audio}: ${e.message}`);
      console.error(`FAIL ${t.slug}/${t.seg.audio}: ${e.message}`);
    }
  });

  // 回写 manifest
  let written = 0;
  for (const [path, list] of byManifest) {
    const m = JSON.parse(readFileSync(path, 'utf8'));
    const byAudio = new Map(list.map((x) => [x.seg.audio, x.url]));
    for (const seg of m.segments) {
      const url = byAudio.get(seg.audio);
      if (url) {
        seg.publicUrl = url;
        written++;
      }
    }
    m.publishedAt = new Date().toISOString();
    writeFileSync(path, JSON.stringify(m, null, 2), 'utf8');
  }
  console.log(`回写 ${written} 段 publicUrl，失败 ${errors.length} 段`);
  if (errors.length) {
    console.error('失败清单：\n' + errors.join('\n'));
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
