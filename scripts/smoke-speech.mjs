// 冒烟验收：真实 Chrome 用受控音频验证朗读播放与手动音量。
// 不依赖图床 / 公网：page.route 拦截 manifest 与 /api/audio/stream，就地生成 WAV。
// 覆盖：手动调音量、增益随音量降低、静音恢复上一次音量、播放不重置设置、
//       刷新持久化、真实播放进度、远程地址走同源流式代理。
// 用法：先 `npm run dev`，再 `npm run smoke:speech`（BASE_URL 可覆盖）
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:25000";
const PAGE = `${BASE}/s/cesium/00`;
const SLUG = "00-cesium-intro";
const REMOTE = "https://cloudflare-imgbed-91r.pages.dev/file/smoke-chapter.wav";
const SEGMENT_SECONDS = 1.5;
const SEGMENTS = 3;

// ---- 受控音频：5 秒 16bit PCM 单声道 WAV（内存生成，不落盘） ----
const SAMPLE_RATE = 16000;
const samples = SAMPLE_RATE * 5;
const pcm = Buffer.alloc(samples * 2);
for (let i = 0; i < samples; i += 1) {
  pcm.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / SAMPLE_RATE) * 6000), i * 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // 单声道
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(SAMPLE_RATE * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);
const WAV = Buffer.concat([header, pcm]);

const manifest = {
  slug: SLUG,
  model: "smoke-test",
  generatedAt: new Date(0).toISOString(),
  segmentCount: SEGMENTS,
  merged: { audio: "chapter.wav", publicUrl: REMOTE },
  segments: Array.from({ length: SEGMENTS }, (_, i) => ({
    index: i,
    text: `第 ${i + 1} 段测试语音`,
    hash: `smoke-${i}`,
    audio: `seg${String(i).padStart(2, "0")}.wav`,
    start: i * SEGMENT_SECONDS,
    duration: SEGMENT_SECONDS,
  })),
};

const failures = [];
function check(ok, label, detail = "") {
  if (ok) {
    console.log(`✓ ${label}`);
  } else {
    failures.push(label);
    console.log(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}
const near = (a, b) => typeof a === "number" && Math.abs(a - b) < 0.02;

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

// 探针：抓到 useSpeech 内部创建的 Audio / GainNode，才能断言真实增益而非界面数字
await page.addInitScript(() => {
  const probe = { audio: null, gain: null, enhanced: false };
  window.__speechProbe = probe;

  const NativeAudio = window.Audio;
  function WrappedAudio(...args) {
    const el = new NativeAudio(...args);
    probe.audio = el;
    return el;
  }
  WrappedAudio.prototype = NativeAudio.prototype;
  window.Audio = WrappedAudio;

  for (const Ctor of [window.AudioContext, window.webkitAudioContext]) {
    if (!Ctor) continue;
    const createGain = Ctor.prototype.createGain;
    Ctor.prototype.createGain = function (...args) {
      const node = createGain.apply(this, args);
      probe.gain = node;
      return node;
    };
    const createSource = Ctor.prototype.createMediaElementSource;
    Ctor.prototype.createMediaElementSource = function (...args) {
      probe.enhanced = true;
      return createSource.apply(this, args);
    };
  }
});

// 受控数据：manifest + 音频（支持 Range，保证边下边播与 seek）
await page.route(/\/audio\//, async (route) => {
  const url = new URL(route.request().url());
  if (url.pathname.endsWith("manifest.json")) {
    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(manifest),
    });
    return;
  }
  const range = route.request().headers().range ?? "";
  const match = /bytes=(\d+)-(\d*)/.exec(range);
  const start = match ? Number(match[1]) : 0;
  const end = match && match[2] ? Math.min(Number(match[2]), WAV.length - 1) : WAV.length - 1;
  const chunk = WAV.subarray(start, end + 1);
  await route.fulfill({
    status: match ? 206 : 200,
    headers: {
      "content-type": "audio/wav",
      "content-length": String(chunk.length),
      "accept-ranges": "bytes",
      "access-control-allow-origin": "*",
      ...(match ? { "content-range": `bytes ${start}-${end}/${WAV.length}` } : {}),
    },
    body: chunk,
  });
});

const slider = page.locator('input[aria-label="朗读音量"]');
const volume = () => slider.inputValue();
const gain = () => page.evaluate(() => window.__speechProbe.gain?.gain.value ?? null);
const audioVolume = () => page.evaluate(() => window.__speechProbe.audio?.volume ?? null);
const audioSrc = () => page.evaluate(() => window.__speechProbe.audio?.src ?? "");

async function setVolume(value) {
  await slider.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function waitPlaying() {
  await page.waitForFunction(
    () => {
      const a = window.__speechProbe.audio;
      return Boolean(a && !a.paused && a.currentTime > 0.2);
    },
    null,
    { timeout: 20000 },
  );
}

await page.goto(PAGE, { waitUntil: "networkidle" });
await slider.waitFor();

// 1) 默认 200% 可手动调节
check((await volume()) === "2", "默认音量为 200%", await volume());
check((await slider.getAttribute("aria-valuetext"))?.includes("200%"), "界面显示 200% 增强");

// 2) 播放：远程地址走同源流式代理，Web Audio 增益 = 2 且原生音量不被二次调低
await page.getByRole("button", { name: "播放", exact: true }).click();
await waitPlaying();
check((await audioSrc()).includes("/api/audio/stream?url="), "远程音频经 /api/audio/stream 同源代理", await audioSrc());
await page.waitForFunction(() => window.__speechProbe.gain !== null, null, { timeout: 10000 });
check(near(await gain(), 2), "增强后 Gain = 2（默认音量）", String(await gain()));
check((await audioVolume()) === 1, "增强后原生音量保持 1，不与增益相乘", String(await audioVolume()));

// 3) 真实播放推进：整章合并模式下按段级 start/duration 跳段
await page.waitForFunction(() => /\b2 \/ 3\b/.test(document.body.innerText), null, { timeout: 15000 });
check(true, "播放推进到第 2 段（真实音频 timeupdate）");
await page.waitForFunction(() => /\b3 \/ 3\b/.test(document.body.innerText), null, { timeout: 15000 });
check(true, "播放推进到第 3 段（真实音频 timeupdate）");

// 4) 手动调低音量要实际降低增益，不是只改界面
await setVolume(0.5);
check((await volume()) === "0.5", "滑块调到 50%");
check(near(await gain(), 0.5), "调低音量后 Gain 实际降到 0.5", String(await gain()));
check((await audioVolume()) === 1, "调低音量后原生音量仍为 1", String(await audioVolume()));

// 5) 手动调高、倍速区外仍保留用户设置
await setVolume(1.5);
check((await slider.getAttribute("aria-valuetext"))?.includes("150%"), "界面显示 150% 增强");
check(near(await gain(), 1.5), "Gain 同步升到 1.5", String(await gain()));

// 6) 静音 → 恢复：回到静音前的音量，而不是固定 200%
await page.getByRole("button", { name: "静音", exact: true }).click();
check((await volume()) === "0", "静音后音量为 0");
check(near(await gain(), 0), "静音后 Gain 为 0", String(await gain()));
await page.getByRole("button", { name: "恢复音量", exact: true }).click();
check((await volume()) === "1.5", "取消静音恢复到静音前的 150%（非 200%）", await volume());

// 7) 暂停后再次播放不重置用户音量
await page.getByRole("button", { name: "暂停", exact: true }).click();
await page.getByRole("button", { name: "播放", exact: true }).click();
await waitPlaying();
check((await volume()) === "1.5", "重新播放后音量仍为 150%", await volume());
check(
  (await page.evaluate(() => localStorage.getItem("learn-gis:speech-volume"))) === "1.5",
  "音量写入 localStorage",
);

// 8) 刷新持久化，且增强链路按持久化音量重建（不二次调低）
await page.reload({ waitUntil: "networkidle" });
await slider.waitFor();
check((await volume()) === "1.5", "刷新后音量仍为 150%", await volume());
await page.getByRole("button", { name: "播放", exact: true }).click();
await waitPlaying();
await page.waitForFunction(() => window.__speechProbe.gain !== null, null, { timeout: 10000 });
check(near(await gain(), 1.5), "刷新后重建的 Gain = 1.5", String(await gain()));
check((await audioVolume()) === 1, "刷新后原生音量仍为 1", String(await audioVolume()));

check(pageErrors.length === 0, "无未捕获页面异常", pageErrors.slice(0, 3).join(" | "));

await browser.close();
console.log(
  failures.length === 0 ? "全部通过" : `失败 ${failures.length} 项：${failures.join("、")}`,
);
process.exit(failures.length === 0 ? 0 : 1);
