# 讲义语音阅读（TTS）方案 v2

> 状态：TTS 服务、抽取器、预生成脚本、播放器、校验器均已落地；17 章 / 1391 段音频已全部生成并校验通过（OK=17 / ERROR=0）；mp3 由用户自行上传图床，manifest 入库随代码发布；部署发布方案见 §7
> 一句话：**本地部署 Fish Speech 模型作独立 TTS 服务**；构建/批处理阶段把每章讲义净化文本送服务合成音频，落盘为静态文件；前端直接播放预生成音频，并保留段落高亮、点击跳播、调速。

---

## 1. 需求与结论

**需求**：讲义支持语音朗读；非叙述性内容（代码块、提示词块、图片、表格、交互组件、注音 IPA 等）自动识别并跳过，不进入朗读流。

**结论**：
- **TTS 引擎 = 本地 Fish Speech 模型**（开源、中文自然度中上、可克隆音色），以**独立服务进程**运行，不依赖任何云/付费 API，完全离线。
- **集成方式 = 预生成**：批处理阶段把净化后的文本送 TTS 服务合成音频，存为静态资源（`public/audio/`），前端当普通音频文件播放。播放零延迟、零运行时依赖、与访客量无关。
- **智能跳过**保留：在预生成阶段的文本抽取环节做净化（等价于旧方案的 DOM 净化，但落在构建期）。

### 非目标（v2 不做）
- 不接任何云 TTS（OpenAI / 火山 / Azure / Edge 逆向）——本方案刻意全本地。
- 不做逐字（word-level）高亮跟随（预生成音频无法拿到 onboundary 事件）；高亮粒度降为**段落级**。
- 不做服务端实时合成（已选预生成；如需长尾实时见 §6 降级）。

---

## 2. 架构总览

```
预生成脚本 --(净化文本 POST /v1/tts)--> Fish Speech 服务(本地 GPU/CPU) --(.mp3)--> public/audio + manifest
                                                                                        |
                                                                                  静态资源 前端 SpeechBar 读 manifest 逐段播
```

### 2.1 TTS 服务（独立进程，已落地）
- 本地运行 **Fish Speech 1.5** 的 `tools/api_server.py`（FastAPI server，监听 `127.0.0.1:18080`）。服务代码在 `f:/Codes/fish-tts/fs15`，运行用 v3 的 venv（`f:/Codes/fish-tts/repo/.venv`，已装 torch 2.8 cu128）。启动脚本见 `f:/Codes/fish-tts/start_server_15.cmd`。
- 合成接口：`POST /v1/tts`（{text, ...} -> audio 音频流），`format` 支持 wav/mp3/opus。
- 中文模型权重 `fishaudio/fish-speech-1.5` 已下到 `fs15/checkpoints/fish-speech-1.5`（约 1.5GB），不联网、不传云。
- **显存约束（实测）**：RTX 5060 仅 8GB，Fish Speech 旗舰 `s2-pro`（9.1GB）放不下（CUDA OOM），CPU 推理又仅 ~0.6 tok/s 不可用；故选 **fish-speech-1.5**（~1.5GB，GPU 显存占用 1.84GB，7.7 tok/s，音质中上）。实测 GPU 推理正常。
- 端口注意：Windows 上 8080 被 Hyper-V 保留，服务改走 18080。
- **环境位置（F 盘，非本仓库）**：TTS 服务代码与权重都在 `f:/Codes/fish-tts/`，与 `learn-gis` 仓库分离；本仓库只调用其 HTTP 接口，不提交模型/venv。

### 2.2 预生成脚本（构建/批处理）
- 遍历各章讲义（MDX 源或渲染后 HTML）-> 净化文本抽取 -> 按段切分 -> 逐段调 /v1/tts -> 落盘音频。
- 输出：
  - `public/audio/<chapter>/segNN.mp3`（建议 opus/mp3 压缩，17 章预估数十~百余 MB）
  - `public/audio/<slug>/manifest.json`：每章一份，段落数组（文本 + 音频文件名 + 文本 hash）；全站共 17 份，详见 §5 / §7。
- 幂等：仅对文本 hash 变化的段重新合成，避免每次全量重跑。

### 2.3 前端播放
- `SpeechBar` 读 `manifest.json`，按段 `<audio>` 顺序播放预生成文件。
- 段落高亮跟随（段级）、点击任意段落从该段起播、`playbackRate` 调速（浏览器原生，无需重合成）。
- 离线即可播，无需 TTS 服务在线。

---

## 3. 智能跳过：文本净化规则（核心，落在预生成期）

旧方案在浏览器用 TreeWalker 净化 DOM；v2 改为预生成期文本抽取，规则等价，但作用于 MDX 源 / 渲染 HTML。

### 3.1 整块跳过
| 内容 | 处理 |
|---|---|
| 代码块 / 提示词块 / 公式块（围栏、pre） | 不读 |
| 图片 / figure | 不读 |
| 宽表 table | 不读，或插入一句「详见表格」占位 |
| ProjPlayground / EmbedMap 交互容器 | 不读 |
| 练习答案区 | 不读 |
| 导航/目录/页头页脚/按钮 | 不读（抽取范围限定在 article 内） |

### 3.2 行内净化
- 行内 code 全跳（坐标数字朗读无意义）。
- IPA 注音跳过：（/.../）部分不读；「伊-利普-扫伊德」谐音部分可读。
- markdown 残留符号（*、->、±）替换或删除。
- 兜底：带 data-no-speech 或 aria-hidden 的块跳过；新增 MDX 组件显式声明即可，无需改抽取器。

### 3.3 边界
默认规则覆盖当前 17 章内容形态（Callout / Exercise / 表格 / 注音）；新类型靠 data-no-speech 扩展。不做 NLP/LLM 语义判断。

---

## 4. 落地步骤

1. 部署 TTS 服务（已完成）：Fish Speech 1.5 运行环境（v3 venv + torch 2.8 cu128）已就绪，中文权重已下到 `f:/Codes/fish-tts/fs15/checkpoints/fish-speech-1.5`，服务 `start_server_15.cmd` 起在 `127.0.0.1:18080`，已验证 `POST /v1/tts` 中文出声。
2. 文本抽取器 `lib/speech/extract.ts`（已完成）：用 unified + remark-parse/mdx/gfm 解析 MDX，按 §3 规则跳过代码块/表格/IPA/交互组件，输出段落数组（heading / paragraph / list-item / callout / 表格占位）。
3. 预生成脚本 `scripts/gen-audio.ts`（已完成）：遍历 `content/gis/*.mdx` -> 调 `/v1/tts` -> 落盘 `public/audio/<slug>/segNN.mp3` + 同目录 `manifest.json`（含文本 hash，支持增量重跑）。
4. 前端播放器 `components/lesson/SpeechBar.tsx` + `lib/speech/useSpeech.ts`（已完成）：读 manifest 逐段播放、当前段高亮、上一段/下一段、点击任意段跳播、`playbackRate` 0.75–1.5x 调速。
5. npm script `gen:audio`（已完成）：`npm run gen:audio [slug]` 可选单章；不挂 prebuild（需本地服务在线，建议手动 / CI 生成）。
6. 校验 `audio:validate`（已完成）：`npm run audio:validate` 校验各章 `manifest.json` 覆盖（段数/index/hash/与 MDX 现抽段数比对）、MP3 帧头与孤立文件，输出完成/待生成/错误统计。

---

## 5. 文件结构（预估）

```
scripts/gen-audio.ts             # 预生成：抽文本->调服务->落盘+manifest
lib/speech/extract.ts            # 文本净化抽取（核心跳过规则）
lib/speech/manifest.ts           # manifest 类型
lib/speech/useSpeech.ts          # 逐段播放 hook（客户端）
components/lesson/SpeechBar.tsx  # 播放条 UI（客户端）
public/audio/<slug>/segNN.mp3    # 预生成音频（gitignore，由 gen:audio 生成）
public/audio/<slug>/manifest.json# 章节->段落->音频映射（slug = 章节文件名）
```

> 存储规则：`public/audio/**/*.mp3` 已加入 `.gitignore`（体积大、不入库，由用户自行上传图床）；各章 `manifest.json`（共 ~284 KB 纯文本）随代码入库。

---

## 6. 降级路径

- 无 GPU：Fish Speech 1.5 回退 CPU 推理（实测 ~0.6 tok/s，分钟级/章），仅影响预生成耗时，播放零影响；当前机器 RTX 5060（8GB）走 GPU（~7.7 tok/s）。
- TTS 服务起不来 / 不想跑服务：前端降级到旧方案 Web Speech API（浏览器原生 speechSynthesis），保证至少能读；manifest 缺失时自动切换。
- 音质不满意：换 CosyVoice / 更高质模型，只要服务接口兼容 /v1/tts，前端无需改动。
- 段落级高亮不够细：若需逐字高亮，后续可改回实时合成（见 §1 非目标），或让 TTS 服务额外返回对齐时间戳——本期不做。

---

## 7. 部署与音频发布（mp3 外置到 CloudFlare ImgBed / HF 渠道）

### 7.1 复用资源与硬约束（实测 2026-11-04）

**复用 `assert-ai` 项目的图床**：它用自部署的 **CloudFlare ImgBed**（开源 MarSeventh/CloudFlare-ImgBed），上传渠道 `huggingface` → 底层落到 HF Dataset 仓库；读取走自建网关，不直接访问 `huggingface.co`。

| 项 | 实测值 |
|---|---|
| 图床站点 | `https://cloudflare-imgbed-91r.pages.dev`（配置见 `assert-ai/.env.local` 的 `IMGBED_URL`） |
| 读取格式 | `https://cloudflare-imgbed-91r.pages.dev/file/{id}`（**扁平纯 id，无目录层级**） |
| 上传端点 | `POST /upload?uploadChannel=huggingface`，`multipart/form-data` 字段 `file`，`Authorization: Bearer <IMGBED_API_TOKEN>` |
| 可达性 | **HTTP 200 / 1.9s**（对比 `huggingface.co` 直连 8s 超时）✅ |
| CORS | `/upload` 返回 `Access-Control-Allow-Origin: *` ✅ |
| 可抄实现 | `assert-ai/src/lib/upload/host.ts` 的 `uploadToHost()`、`config.ts` 的 `imgbedUrl()` |

这比「直连 HF Hub」好：域名国内可达、CORS 通配、上传走 ImgBed 后端代理（无需我们连 HF 主站）。原来的三个坑一次解决。

**但有三个新障碍（来自 assert-ai 实战）**：

1. **HF commit 限速 128 次/小时** —— `assert-ai/src/lib/upload/rate-limit.ts` 专门为此设了 ≈28.1s 最小提交间隔 + 滑动窗口，且注明「仅 `channel=huggingface` 时启用，其它渠道（cfr2/s3/telegram）不受限」。我们有 **1391 个碎 mp3**，逐段上传 ≈ 11 小时且必然 429。**不能一段一次**。
2. **`/file/{id}` 是扁平 id** —— 不支持 `<slug>/segNN.mp3` 层级。需靠 `uploadFolder` 参数建目录（assert-ai 未用过、待验证），或把 slug 编进文件名。上传后须把返回的 `publicUrl` **回写进 manifest**，不能沿用相对文件名。
3. **ImgBed 是否接受 `.mp3` / `audio/mpeg` 未经实测**（assert-ai 只传图片）；文件名需 ASCII 规范化（我们 `segNN.mp3` 已合规）。

**结论**：架构仍成立（mp3 外置、manifest 入库），但上传脚本要改成走 ImgBed API 并解决批量，不是简单的 `huggingface_hub.upload_folder()`。

本地现状：17 章 / 1391 段 mp3 已全部生成（113.9 MB，单段中位 ~70 KB、最大 473 KB），`audio:validate` 校验 `OK=17 / ERROR=0`、全量解码 1391/1391 通过；mp3 被 `.gitignore` 忽略，17 份 `manifest.json` 已入库。前端 `useSpeech.ts` 用 `fetch` 读同源 manifest、`<audio src>` 逐段播本地文件；上传图床后需按 §7.3 回写 `publicUrl` 并切换前端 URL。

### 7.2 推荐架构：大文件外置，小文件入库

```
git 仓库（随代码发布）
  public/audio/<slug>/manifest.json   ~20 KB/章，共 ~340 KB，纯文本、可 diff
    text / hash + 上传后回写的 publicUrl（绝对地址）
    由 npm run gen:audio 生成 -> npm run audio:upload 回写 -> 提交进 git

CloudFlare ImgBed /file/{id}（不进 git）
  1391 个 mp3，~130 MB，HF Dataset 仓库兜底存储
    POST /upload?uploadChannel=huggingface

浏览器
  fetch 同源 manifest（本地，无 CORS 问题）
  <audio src='{publicUrl}'>（跨域播放，ImgBed 侧 ACAO:*）
```

把「体积大的」和「部署必需的」拆开：mp3 外置图床，manifest 随代码入库。这样任何从 git clone 后直接 build 的部署（Vercel / CI）都能拿到完整清单，只需音频域名可达；`prebuild` 仍不必挂 `gen:audio`。

### 7.3 改动点（逐文件）

| 文件 | 改动 |
|---|---|
| `lib/speech/manifest.ts` | `SpeechSegmentManifest` 增加可选 `publicUrl?: string`（图床返回的绝对地址）；`segmentUrl(seg)` 优先取 `publicUrl`，否则回退本地 `/audio/<slug>/<audio>`。保留 `chapterManifestUrl()` 同源。 |
| `lib/speech/useSpeech.ts` | 第 78 行 manifest 仍同源 `chapterManifestUrl(slug)`；第 87 行段音频改用 `segmentUrl(x)`。 |
| `scripts/gen-audio.ts` | 仅写 `audio: 'segNN.mp3'` 与 `text/hash`，**不写域名**；`publicUrl` 留给上传脚本回写。 |
| `scripts/upload-audio-imgbed.mjs`（新增） | 抄 `assert-ai/src/lib/upload/host.ts`：`POST {IMGBED_URL}/upload?uploadChannel=huggingface`，`FormData` 带 `file` + `Bearer ${IMGBED_API_TOKEN}`，解析响应的 `publicUrl`/`src`，**回写进各章 manifest.json**；跳过已带 `publicUrl` 的段（幂等，支持断点续传）。 |
| `package.json` | 新增 `'audio:upload': 'node scripts/upload-audio-imgbed.mjs'`。 |
| `.gitignore` | `public/audio/` → `public/audio/**/*.mp3`，让 `manifest.json` 可提交。 |
| `.env.example` | 新增 `IMGBED_URL`（填 `https://cloudflare-imgbed-91r.pages.dev`）、`IMGBED_API_TOKEN`（需 `upload` 权限，不落盘）。 |

**上传脚本必须解决的两个问题**（否则会踩 §7.1 的坑）：

1. **批量而非逐段**：优先试 `/upload` 的 `uploadFolder` 参数或一次 multipart 多文件，把 HF commit 次数压到 128/小时以内；否则改走 `uploadChannel=cfr2|s3|telegram`（`rate-limit.ts` 注明这些渠道不受 HF 限速）。
2. **扁平 id**：`publicUrl` 是 `.../file/{id}`，不是 `<slug>/segNN.mp3`；manifest 存回写的绝对 URL，前端不拼路径。文件名用 ASCII（可加 slug 前缀避免重名，如 `01-math-notation-seg00.mp3`）。

### 7.4 已确认与待验证

**已确认（参考 `assert-ai` 项目，实测 2026-11-04）**：资源类型 = CloudFlare ImgBed + `huggingface` 渠道（底层 HF Dataset 仓库）；真实域名 `https://cloudflare-imgbed-91r.pages.dev`；读取格式 `/file/{id}`；站点可达（200 / 1.9s）、CORS `*`；上传实现可直接抄 `assert-ai/src/lib/upload/host.ts`。原先「域名不可达 / CORS / 上传通道」三项顾虑均已解除。

**仍需实测验证（动手前）**：

1. **`.mp3` 是否被 ImgBed 接受** —— assert-ai 只传过图片，需用一段真实 mp3 试传 `POST /upload?uploadChannel=huggingface`，确认返回 `publicUrl` 且 `Content-Type: audio/mpeg` 可直链播放。
2. **批量上传可行性** —— 试 `uploadFolder` 参数或单次 multipart 多文件，确认 HF commit 不会按文件数逐次累加；若不行，改走 `uploadChannel=cfr2|s3|telegram`（不受 HF 128 次/小时限速）。
3. **Token** —— `IMGBED_API_TOKEN` 需具备 `upload` 权限，在 ImgBed 管理界面生成，仅存环境变量。

### 7.5 备选方案（若 HF 不可行）

| 方案 | 做法 | 代价 |
|---|---|---|
| A. 随产物上传 | 本机 `gen:audio` → `build` → 把 `public/audio/` 一起发布 | 零代码改动；Git-based 部署不适用，且必须**先生成再 build**（`next build` 会拷贝 `public/`） |
| B. CI 生成 | 流水线连 TTS 服务跑 `gen:audio` 再 build | 需 GPU 服务常驻可达；全量 ~14 s/段 ≈ 5.5 h，必须缓存 `public/audio/` 做增量；配 `TTS_URL` |
| C. ImgBed 换渠道 | 同一 ImgBed，但 `uploadChannel=cfr2\|s3\|telegram` | 绕过 HF commit 限速；改动量最小（只改一个 query 参数），优先验证 |
| D. 其他对象存储 / CDN | S3 / 火山 TOS / Vercel Blob | 改动点同 §7.3，只换上传脚本与前缀；国内可达、CORS 可控，最稳 |
| E. git-lfs | `git lfs track 'public/audio/**/*.mp3'` | 配额/带宽成本、clone 变重、二进制 diff 无意义；不推荐 |

### 7.6 发布前检查

- `npm run audio:validate` → `OK=17 / ERROR=0`
- `git ls-files public/audio` 应只有 17 个 `manifest.json`，无 mp3
- 上传后确认各章 manifest 的 `publicUrl` 均非空、指向 ImgBed `/file/{id}`
- 打开任一章：`SpeechBar` 显示「朗读本节」而非「音频尚未生成」，抽查一段能出声
- `git ls-files public/audio` 中 `manifest.json` 已提交（含回写的 `publicUrl`）

---

## 8. v1 旧方案（已废弃，作降级保留）

原 docs/TTS.md 采用浏览器原生 Web Speech API + DOM 净化。在本地模型服务不可用或不想维护服务时，作为纯前端降级方案保留（详见 §6）。新方案以本地 Fish Speech 服务 + 预生成为准。
