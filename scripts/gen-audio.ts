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

function sha1(s: string): string {
  return createHash('sha1').update(s, 'utf8').digest('hex').slice(0, 16);
}

async function tts(text: string): Promise<Buffer> {
  const res = await fetch(TTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, format: FORMAT, normalize: true, streaming: false }),
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

  const outSegs: SpeechSegmentManifest[] = [];
  let generated = 0;
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (!seg) continue;
    const hash = sha1(seg.text);
    const audioName = 'seg' + String(i).padStart(2, '0') + '.mp3';
    const audioPath = join(chapterDir, audioName);
    const existing = prevByHash.get(hash);
    if (existing && existsSync(existing)) {
      const bytes = readFileSync(existing);
      if (!existsSync(audioPath)) writeFileSync(audioPath, bytes);
      outSegs.push({ index: i, text: seg.text, hash, audio: audioName });
      continue;
    }
    const buf = await tts(seg.text);
    writeFileSync(audioPath, buf);
    generated++;
    outSegs.push({ index: i, text: seg.text, hash, audio: audioName });
    console.log('  + ' + audioName + ' (' + (buf.length / 1024).toFixed(1) + ' KB)');
  }

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
  console.log('TTS endpoint: ' + TTS_URL);
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
