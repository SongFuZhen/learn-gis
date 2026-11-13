// 冒烟验收：真实 Chrome 用受控音频验证朗读播放与手动音量。
// 不依赖图床 / 公网：page.route 拦截 manifest 与 /api/audio/stream，就地生成 WAV。
// 覆盖：手动调音量、增益随音量降低、播放中拉过 100% 即时启用增强且不打断播放、
//       静音恢复上一次音量、播放不重置设置、刷新持久化、真实播放进度、同源流式代理、
//       静音态刷新后恢复上一次可听音量（last-audible 持久化）、
//       跨章节跳转（第二 / 第三 slug 连续跳转）时上一章音频立即停播且无遗留播放。
// 用法：先 `npm run dev`，再 `npm run smoke:speech`
//      （BASE_URL / SKILL / SLUG / SLUG2 / SLUG3 可覆盖；默认 cesium 前三章）
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:25000";
const SKILL = process.env.SKILL ?? "cesium";
const PAGE = `${BASE}/s/${SKILL}/00`;
const SLUG = process.env.SLUG ?? "00-cesium-intro";
const SLUG2 = process.env.SLUG2 ?? "01-camera-coords";
const SLUG3 = process.env.SLUG3 ?? "02-imagery-layers";
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

// 第二个 slug 的受控 manifest：段文本刻意不同，用于断言跳转后真正加载了新章节的 manifest。
const manifest2 = {
  ...manifest,
  slug: SLUG2,
  segments: Array.from({ length: SEGMENTS }, (_, i) => ({
    index: i,
    text: `第二章第 ${i + 1} 段：相机与坐标系`,
    hash: `smoke2-${i}`,
    audio: `seg${String(i).padStart(2, "0")}.wav`,
    start: i * SEGMENT_SECONDS,
    duration: SEGMENT_SECONDS,
  })),
};

// 第三个 slug 的受控 manifest：同理，验证连续跳转（00→01→02）时每一章都独立停/起。
const manifest3 = {
  ...manifest,
  slug: SLUG3,
  segments: Array.from({ length: SEGMENTS }, (_, i) => ({
    index: i,
    text: `第三章第 ${i + 1} 段：影像图层`,
    hash: `smoke3-${i}`,
    audio: `seg${String(i).padStart(2, "0")}.wav`,
    start: i * SEGMENT_SECONDS,
    duration: SEGMENT_SECONDS,
  })),
};

const MANIFESTS = { [SLUG]: manifest, [SLUG2]: manifest2, [SLUG3]: manifest3 };

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

// ---- 页面夹具 ----
async function installProbe(page) {
  // 抓到 useSpeech 内部创建的 Audio / GainNode / AudioContext，才能断言真实增益而非界面数字
  await page.addInitScript(() => {
    const probe = { audio: null, audios: [], gain: null, context: null, enhanced: false };
    window.__speechProbe = probe;

    const NativeAudio = window.Audio;
    function WrappedAudio(...args) {
      const el = new NativeAudio(...args);
      probe.audio = el;
      probe.audios.push(el);
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
        probe.context = this;
        return createSource.apply(this, args);
      };
    }
  });
}

async function installRoutes(page) {
  // 受控数据：manifest + 音频（支持 Range，保证边下边播与 seek）
  await page.route(/\/audio\//, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("manifest.json")) {
      // 按请求路径里的 slug 选择 manifest，模拟各章节独立音频
      const seg = url.pathname.split("/").filter(Boolean);
      const slug = seg[seg.length - 2] ?? "";
      const chosen = MANIFESTS[slug] ?? manifest;
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(chosen),
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
}

// ---- 页面内读数与操作 ----
const sliderOf = (page) => page.locator('input[aria-label="朗读音量"]');
const volume = (page) => sliderOf(page).inputValue();
const gain = (page) => page.evaluate(() => window.__speechProbe.gain?.gain.value ?? null);
const audioVolume = (page) => page.evaluate(() => window.__speechProbe.audio?.volume ?? null);
const audioSrc = (page) => page.evaluate(() => window.__speechProbe.audio?.src ?? "");
const probe = (page) =>
  page.evaluate(() => ({
    enhanced: window.__speechProbe.enhanced,
    contextState: window.__speechProbe.context?.state ?? null,
  }));
const currentTime = (page) => page.evaluate(() => window.__speechProbe.audio?.currentTime ?? -1);

async function setVolume(page, value) {
  await sliderOf(page).evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function waitPlaying(page) {
  await page.waitForFunction(
    () => {
      const a = window.__speechProbe.audio;
      return Boolean(a && !a.paused && a.currentTime > 0.2);
    },
    null,
    { timeout: 20000 },
  );
}

let browser;
try {
  browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });

  // ========== 场景一：默认 200% 起播 ==========
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await installProbe(page);
  await installRoutes(page);

  await page.goto(PAGE, { waitUntil: "networkidle" });
  await sliderOf(page).waitFor();

  // 1) 默认 200% 可手动调节
  check((await volume(page)) === "2", "默认音量为 200%", await volume(page));
  check(
    (await sliderOf(page).getAttribute("aria-valuetext"))?.includes("200%"),
    "界面显示 200% 增强",
  );

  // 2) 播放：远程地址走同源流式代理，Web Audio 增益 = 2 且原生音量不被二次调低
  await page.getByRole("button", { name: "播放", exact: true }).click();
  await waitPlaying(page);
  check(
    (await audioSrc(page)).includes("/api/audio/stream?url="),
    "远程音频经 /api/audio/stream 同源代理",
    await audioSrc(page),
  );
  await page.waitForFunction(() => window.__speechProbe.gain !== null, null, { timeout: 10000 });
  check(near(await gain(page), 2), "增强后 Gain = 2（默认音量）", String(await gain(page)));
  check(
    (await audioVolume(page)) === 1,
    "增强后原生音量保持 1，不与增益相乘",
    String(await audioVolume(page)),
  );

  // 3) 真实播放推进：整章合并模式下按段级 start/duration 跳段
  await page.waitForFunction(() => /\b2 \/ 3\b/.test(document.body.innerText), null, { timeout: 15000 });
  await page.waitForFunction(() => /\b3 \/ 3\b/.test(document.body.innerText), null, { timeout: 15000 });

  // 4) 手动调低音量要实际降低增益，不是只改界面
  await setVolume(page, 0.5);
  check((await volume(page)) === "0.5", "滑块调到 50%");
  check(near(await gain(page), 0.5), "调低音量后 Gain 实际降到 0.5", String(await gain(page)));
  check((await audioVolume(page)) === 1, "调低音量后原生音量仍为 1", String(await audioVolume(page)));

  // 5) 手动调高、倍速区外仍保留用户设置
  await setVolume(page, 1.5);
  check(
    (await sliderOf(page).getAttribute("aria-valuetext"))?.includes("150%"),
    "界面显示 150% 增强",
  );
  check(near(await gain(page), 1.5), "Gain 同步升到 1.5", String(await gain(page)));

  // 6) 静音 → 恢复：回到静音前的音量，而不是固定 200%
  await page.getByRole("button", { name: "静音", exact: true }).click();
  check((await volume(page)) === "0", "静音后音量为 0");
  check(near(await gain(page), 0), "静音后 Gain 为 0", String(await gain(page)));
  await page.getByRole("button", { name: "恢复音量", exact: true }).click();
  check(
    (await volume(page)) === "1.5",
    "取消静音恢复到静音前的 150%（非 200%）",
    await volume(page),
  );

  // 7) 暂停后再次播放不重置用户音量
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await page.getByRole("button", { name: "播放", exact: true }).click();
  await waitPlaying(page);
  check((await volume(page)) === "1.5", "重新播放后音量仍为 150%", await volume(page));
  check(
    (await page.evaluate(() => localStorage.getItem("learn-gis:speech-volume"))) === "1.5",
    "音量写入 localStorage",
  );

  // 8) 刷新持久化，且增强链路按持久化音量重建（不二次调低）
  await page.reload({ waitUntil: "networkidle" });
  await sliderOf(page).waitFor();
  check((await volume(page)) === "1.5", "刷新后音量仍为 150%", await volume(page));
  await page.getByRole("button", { name: "播放", exact: true }).click();
  await waitPlaying(page);
  await page.waitForFunction(() => window.__speechProbe.gain !== null, null, { timeout: 10000 });
  check(near(await gain(page), 1.5), "刷新后重建的 Gain = 1.5", String(await gain(page)));
  check((await audioVolume(page)) === 1, "刷新后原生音量仍为 1", String(await audioVolume(page)));
  check(pageErrors.length === 0, "场景一无未捕获页面异常", pageErrors.slice(0, 3).join(" | "));

  // ========== 场景二：≤100% 起播，播放中拉过 100% ==========
  // 独立页面（独立 storage），预置 80% 音量，模拟「首次播放时音量 ≤100%」
  const page2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors2 = [];
  page2.on("pageerror", (e) => errors2.push(String(e)));
  await page2.addInitScript(() => {
    localStorage.setItem("learn-gis:speech-volume", "0.8");
  });
  await installProbe(page2);
  await installRoutes(page2);
  await page2.goto(PAGE, { waitUntil: "networkidle" });
  await sliderOf(page2).waitFor();

  check((await volume(page2)) === "0.8", "场景二：起始音量为 80%（来自持久化值）", await volume(page2));
  await page2.getByRole("button", { name: "播放", exact: true }).click();
  await waitPlaying(page2);
  check(!(await probe(page2)).enhanced, "起始 ≤100% 时未启用 Web Audio 增强");
  check((await audioVolume(page2)) === 0.8, "未增强时原生音量为 0.8", String(await audioVolume(page2)));
  check((await gain(page2)) === null, "此时尚未创建 GainNode");

  const t0 = await currentTime(page2);
  await setVolume(page2, 1.5);
  await page2.waitForFunction(() => window.__speechProbe.gain !== null, null, { timeout: 10000 });
  check((await volume(page2)) === "1.5", "播放中把音量拉到 150%");
  check((await probe(page2)).enhanced, "播放中即时接上 Web Audio 增益链路");
  check(near(await gain(page2), 1.5), "播放中启用增强后 Gain = 1.5", String(await gain(page2)));
  check(
    (await audioVolume(page2)) === 1,
    "增强后原生音量改为 1（不与增益相乘）",
    String(await audioVolume(page2)),
  );
  await page2.waitForFunction(
    () => window.__speechProbe.context?.state === "running",
    null,
    { timeout: 10000 },
  );
  check((await probe(page2)).contextState === "running", "AudioContext 已 running（不会静音）");

  const t1 = await currentTime(page2);
  check(
    t1 >= t0 - 0.05,
    "拉高音量未回退播放进度（crossOrigin 未触发重载）",
    `t0=${t0.toFixed(2)} t1=${t1.toFixed(2)}`,
  );
  await page2.waitForFunction(
    (t) => window.__speechProbe.audio.currentTime > t + 0.25,
    t1,
    { timeout: 10000 },
  );
  check(
    (await sliderOf(page2).getAttribute("aria-valuetext"))?.includes("150%"),
    "场景二界面显示 150% 增强",
  );
  check(
    (await page2.evaluate(() => localStorage.getItem("learn-gis:speech-volume"))) === "1.5",
    "场景二音量写入 localStorage",
  );
  check(errors2.length === 0, "场景二无未捕获页面异常", errors2.slice(0, 3).join(" | "));

  // ========== 场景三：静音态刷新后恢复上一次可听音量（last-audible 持久化）==========
  const page3 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors3 = [];
  page3.on("pageerror", (e) => errors3.push(String(e)));
  await page3.addInitScript(() => {
    // 模拟「上次在 150% 时静音」：音量态存 0，last-audible 存 1.5
    localStorage.setItem("learn-gis:speech-volume", "0");
    localStorage.setItem("learn-gis:speech-last-audible", "1.5");
  });
  await installProbe(page3);
  await installRoutes(page3);
  await page3.goto(PAGE, { waitUntil: "networkidle" });
  await sliderOf(page3).waitFor();

  check((await volume(page3)) === "0", "场景三：刷新后仍为静音态（音量 0）", await volume(page3));
  await page3.getByRole("button", { name: "恢复音量", exact: true }).click();
  check(
    (await volume(page3)) === "1.5",
    "静音态刷新后恢复上一次可听音量 150%（非固定 100%）",
    await volume(page3),
  );
  check(errors3.length === 0, "场景三无未捕获页面异常", errors3.slice(0, 3).join(" | "));

  // ========== 场景四：跨章节跳转（第二 slug）应立停上一章音频并复用同一 Audio ==========
  // 独立页面、默认 200%；从 /s/cesium/00 客户端跳转到 /s/cesium/01，验证上一章音频被暂停、
  // 进度冻结、且 SpeechBar 复用同一个 Audio 元素（而非重新挂载），随后新章节可正常起播。
  const page4 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors4 = [];
  page4.on("pageerror", (e) => errors4.push(String(e)));
  await installProbe(page4);
  await installRoutes(page4);
  await page4.goto(PAGE, { waitUntil: "networkidle" });
  await sliderOf(page4).waitFor();

  await page4.getByRole("button", { name: "播放", exact: true }).click();
  await waitPlaying(page4);

  // 给「正在播放」的音频元素打标记（StrictMode 下页面可能有多个元素，只有当前活动的是在播的）
  await page4.evaluate(() => {
    window.__speechProbe.audio.__navTag = "playing";
  });

  // 客户端跳转（Next <Link>）：点「下一章」而非整页刷新
  await page4.getByRole("link", { name: /下一章/ }).click();
  await page4.waitForURL(`**/${SKILL}/01`, { timeout: 15000 });
  // 等第二 slug 的 manifest 加载完（段文本变为第二章内容）
  await page4.waitForFunction(
    () => document.body.innerText.includes("第二章第 1 段：相机与坐标系"),
    null,
    { timeout: 15000 },
  );

  // 跳转后：被打标记的「上一章正在播放」音频已暂停 —— 旧音频真正停下，而非静音残留
  const oldPaused = await page4.evaluate(() => {
    const el = window.__speechProbe.audios.find((a) => a.__navTag === "playing");
    return el ? el.paused === true : false;
  });
  check(oldPaused, "跳转后上一章正在播放的音频已暂停（旧音频真正停播）");
  // 整页所有 Audio 元素此时都静音：无遗留播放、无后台 orphan 在响
  const allPaused = await page4.evaluate(() =>
    window.__speechProbe.audios.every((a) => a.paused === true),
  );
  check(allPaused, "跳转后页面所有 Audio 元素均静音（无遗留播放）");

  // 第二 slug 的 manifest 确实加载：段列表显示第二章文本
  check(
    await page4.evaluate(() =>
      document.body.innerText.includes("第二章第 2 段：相机与坐标系"),
    ),
    "第二 slug 的 manifest 已加载（段列表更新为第二章）",
  );

  // 在新章节上起播，验证复用元素仍可用、增益链路照常工作
  await page4.getByRole("button", { name: "播放", exact: true }).click();
  await waitPlaying(page4);
  await page4.waitForFunction(() => window.__speechProbe.gain !== null, null, { timeout: 10000 });
  check(near(await gain(page4), 2), "第二 slug 起播后 Gain = 2（默认音量增强）", String(await gain(page4)));
  check((await audioVolume(page4)) === 1, "第二 slug 起播后原生音量仍为 1", String(await audioVolume(page4)));

  // ========== 场景五：连续跳转第三 slug（01 → 02），验证每章独立停/起无状态泄漏 ==========
  // 复用 page4：当前正播第二章（01），再点「下一章」跳到第三章（02）。重点验证上一章（01）
  // 在播音频被停、无遗留播放，且第三 slug 的 manifest 与增益链路正常接管。
  await page4.evaluate(() => {
    window.__speechProbe.audio.__navTag = "playing-2";
  });
  await page4.getByRole("link", { name: /下一章/ }).click();
  await page4.waitForURL(`**/${SKILL}/02`, { timeout: 15000 });
  await page4.waitForFunction(
    () => document.body.innerText.includes("第三章第 1 段：影像图层"),
    null,
    { timeout: 15000 },
  );

  // 被打标记的「第二章在播」音频已暂停（连续跳转不残留上一章声音）
  const secondPaused = await page4.evaluate(() => {
    const el = window.__speechProbe.audios.find((a) => a.__navTag === "playing-2");
    return el ? el.paused === true : false;
  });
  check(secondPaused, "连续跳转后第二章在播音频已暂停（无状态泄漏）");
  check(
    await page4.evaluate(() => window.__speechProbe.audios.every((a) => a.paused === true)),
    "连续跳转后所有 Audio 元素均静音（无遗留播放）",
  );
  check(
    await page4.evaluate(() =>
      document.body.innerText.includes("第三章第 2 段：影像图层"),
    ),
    "第三 slug 的 manifest 已加载（段列表更新为第三章）",
  );
  await page4.getByRole("button", { name: "播放", exact: true }).click();
  await waitPlaying(page4);
  await page4.waitForFunction(() => window.__speechProbe.gain !== null, null, { timeout: 10000 });
  check(near(await gain(page4), 2), "第三 slug 起播后 Gain = 2（默认音量增强）", String(await gain(page4)));
  check((await audioVolume(page4)) === 1, "第三 slug 起播后原生音量仍为 1", String(await audioVolume(page4)));
  check(errors4.length === 0, "场景四/五无未捕获页面异常", errors4.slice(0, 3).join(" | "));
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  failures.push("脚本异常：" + msg);
  console.log(`✗ 脚本异常：${msg}`);
} finally {
  await browser?.close();
}

console.log(
  failures.length === 0 ? "全部通过" : `失败 ${failures.length} 项：${failures.join("、")}`,
);
process.exit(failures.length === 0 ? 0 : 1);
