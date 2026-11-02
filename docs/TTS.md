# 讲义语音阅读（TTS）方案

> 状态：已调研，待实施
> 一句话：用浏览器原生 speechSynthesis 做朗读，DOM 层净化实现"智能跳过"——代码/提示词块、图片、表格、注音 IPA 等不读。

---

## 1. 需求与结论

**需求**：讲义支持语音朗读；非叙述性内容（代码块、提示词块、图片、表格、交互组件等）要能自动识别并跳过，不进入朗读流。

**结论**：朗读引擎用 **Web Speech API**（浏览器原生 `speechSynthesis`），零成本、零依赖、离线可用；"智能识别"在 **DOM 层做净化遍历**（`TreeWalker`），不依赖 LLM 或 TTS 厂商的猜测。全部前端实现，不碰后端。

### 非目标（v1 不做）
- 不接付费云 TTS（OpenAI / 火山 / Azure / MiniMax），后续可作为"设置里填 key"的可选增强。
- 不用 Edge TTS 逆向接口（非官方、有 DRM token 校验、随时可能封）。
- 不在服务端预生成音频文件。

---

## 2. 引擎对比（调研结论）

| 方案 | 音质 | 成本 | 稳定性 | 结论 |
|---|---|---|---|---|
| **Web Speech API** | Edge 晓晓/云希神经声音很好；Chrome Google 普通话够用；Safari 婷婷尚可 | 免费、零依赖 | 高，离线可用 | **采用** |
| Edge TTS 逆向接口（msedge-tts） | Azure 同款神经声音，各端一致 | 免费白嫖 | 低：非官方，DRM token 已打过补丁但随时可能封 | 不采用 |
| 云 API（OpenAI TTS / 火山 / Azure F0 / MiniMax） | 最好，可控情感 | 按量付费（Azure F0 每月 50 万字免费） | 高，但要后端代理 + key | v2 可选增强 |
| 本地开源模型（piper / CosyVoice） | 一般~好 | 需 GPU 服务器 | — | 对静态站太重，排除 |

选择 Web Speech API 的理由：讲义为纯静态渲染（MDX），访客量不可控，免费方案是唯一可持续选项；主流浏览器均自带可用中文声音，Edge 上体验已接近神经 TTS。

---

## 3. 智能识别：DOM 净化规则（核心）

讲义是 MDX 结构化渲染，DOM 天然可精确决策。实现：`TreeWalker` 遍历 `<article.prose-lesson>` 内文本节点，按规则生成"朗读段落序列"（每段 = 一个块级元素），再逐段送入 utterance 队列。

### 3.1 整块跳过

| 选择器 / 容器 | 对应内容 | 处理 |
|---|---|---|
| `pre` | 代码块、提示词块、公式块 | 不读 |
| `img` / `figure` | 图片 | 不读 |
| `table` | 宽表 | 不读，或插入一句"详见表格" |
| `.proj-playground`、地图容器 | ProjPlayground / EmbedMap 交互组件 | 不读 |
| `ExerciseSolution` 答案区 | 练习答案 | 不读 |
| 导航、按钮、目录、页头页脚 | UI 元素 | 不读（遍历范围限定在 article 内即可） |

### 3.2 行内净化

- 行内 `code` 全跳（坐标数字如 `116.4074°E, 39.9042°N` 朗读无意义）。
- **IPA 注音跳过**：`（/ˌiː piː ˈɛs dʒiː/` 部分不读（逐字符朗读是灾难）；「伊-皮-艾斯-吉」谐音部分可读。
- markdown 残留符号（`*`、`→`、`±` 等）替换或删除。
- 兜底规则：容器带 `data-no-speech` 或 `aria-hidden` 即跳过；后续新增 MDX 组件显式声明即可，不需要改朗读器。

### 3.3 "智能"的边界

默认规则覆盖当前全部 17 章讲义的内容形态（Callout / Exercise / 表格 / 注音）；新内容类型靠 `data-no-speech` 显式声明扩展。不做 NLP/LLM 语义判断。

---

## 4. 落地形态

### 4.1 UI

讲义页悬浮播放条（客户端组件）：

- 播放 / 暂停 / 停止；
- 语速 0.75~1.5x；
- 声音选择（列出 `getVoices()` 中的中文声音）；
- **当前段落高亮跟随 + 自动滚动**；
- 点击任意段落可从该处起读。

### 4.2 技术要点

- 朗读源 = 净化后的段落序列，逐段 `SpeechSynthesisUtterance` 队列播放（规避 Chrome 约 32k 字符的 utterance 截断）。
- iOS Safari 需用户手势触发首次 `speak()`。
- `onboundary` 或逐段回调驱动高亮。
- 声音加载（`voiceschanged`）异步，需等待后再列声音。

### 4.3 文件结构（预估）

```
components/lesson/SpeechBar.tsx      // 播放条 UI
lib/speech/extract.ts                // DOM 净化 + 段落序列提取
lib/speech/useSpeech.ts              // 播放队列 hook
```

### 4.4 验收

- `npm run verify` 通过；
- 代码块、图片、表格、ProjPlayground、注音 IPA 均不进入朗读流；
- 段落高亮与播放进度一致，点击段落可跳读；
- Edge / Chrome / Safari / 移动端均可出声。

---

## 5. v2 可选增强（不在本次范围）

- 设置页接自定义 TTS：服务端 route 代理 OpenAI TTS / Azure（F0 免费额度）/ 火山，音质升级。
- 语速/音色持久化到用户设置（DB）。
- 章节级"连续朗读"（读完自动进入下一章）。
