import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { extractSpeechSegments } from '../lib/speech/extract';
import type { ChapterManifest, SpeechSegmentManifest } from '../lib/speech/manifest';

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, 'content', 'gis');
const OUT_DIR = join(ROOT, 'public', 'audio');
const TTS_URL = process.env.TTS_URL || 'http://127.0.0.1:18080/v1/tts';
const FORMAT = 'mp3';
const MODEL = 'fish-speech-1.5';
// 传入 reference_id 时用同一参考音频锁定音色；FORCE_REGEN=1 时跳过增量复用（音频字节变了但文本 hash 没变）
const REFERENCE_ID = process.env.REFERENCE_ID || undefined;
const FORCE_REGEN = process.env.FORCE_REGEN === '1';
const USE_CACHE = process.env.USE_CACHE || 'on';
// 并发路数：TTS 服务是 FastAPI，可并行；GPU 空闲 5GB 时 4 路安全
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY) || 4);

// 有界并发：保持结果按输入顺序返回
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const cur = cursor++;
      const item = items[cur]!;
      results[cur] = await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function sha1(s: string): string {
  return createHash('sha1').update(s, 'utf8').digest('hex').slice(0, 16);
}

async function tts(text: string): Promise<Buffer> {
  const res = await fetch(TTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text, format: FORMAT, normalize: true, streaming: false,
      ...(REFERENCE_ID ? { reference_id: REFERENCE_ID, use_memory_cache: USE_CACHE } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error('TTS ' + res.status + ': ' + body.slice(0, 200));
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function genChapter(slug: string): Promise<void> {
  const mdxPath = join(CONTENT_DIR, slug + '.mdx');
  if (!existsSync(mdxPath)) {
    console.warn('skip ' + slug + ': no mdx file');
    return;
  }
  const mdx = readFileSync(mdxPath, 'utf8');
  const segs = extractSpeechSegments(mdx);
  console.log('[' + slug + '] ' + segs.length + ' segments extracted');

  const chapterDir = join(OUT_DIR, slug);
  mkdirSync(chapterDir, { recursive: true });

  const manifestPath = join(chapterDir, 'manifest.json');
  let prev: ChapterManifest | null = null;
  if (existsSync(manifestPath)) {
    try { prev = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch {}
  }
  const prevByHash = new Map<string, string>();
  if (prev) for (const s of prev.segments) prevByHash.set(s.hash, join(chapterDir, s.audio));

  const outSegs: SpeechSegmentManifest[] = await mapLimit(
    segs.map((seg, i) => ({ seg, i })),
    CONCURRENCY,
    async ({ seg, i }) => {
      const hash = sha1(seg.text);
      const audioName = 'seg' + String(i).padStart(2, '0') + '.mp3';
      const audioPath = join(chapterDir, audioName);
      const existing = FORCE_REGEN ? undefined : prevByHash.get(hash);
      if (existing && existsSync(existing)) {
        const bytes = readFileSync(existing);
        if (!existsSync(audioPath)) writeFileSync(audioPath, bytes);
        return { index: i, text: seg.text, hash, audio: audioName };
      }
      const buf = await tts(seg.text);
      writeFileSync(audioPath, buf);
      console.log('  + ' + audioName + ' (' + (buf.length / 1024).toFixed(1) + ' KB)');
      return { index: i, text: seg.text, hash, audio: audioName };
    },
  );
  const generated = outSegs.length - (prev ? prev.segments.length : 0);

  const manifest: ChapterManifest = {
    slug,
    model: MODEL,
    generatedAt: new Date().toISOString(),
    segmentCount: outSegs.length,
    segments: outSegs,
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('[' + slug + '] manifest written, ' + generated + ' new audio generated');
}

async function main(): Promise<void> {
  const only = process.argv[2];
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx'));
  const slugs = (only ? [only] : files.map((f) => f.replace(/\.mdx$/, ''))).sort();
  console.log('TTS endpoint: ' + TTS_URL + ' (concurrency=' + CONCURRENCY + ')');
  for (const slug of slugs) {
    try {
      await genChapter(slug);
    } catch (e) {
      console.error('[' + slug + '] FAILED: ' + (e as Error).message);
    }
  }
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
