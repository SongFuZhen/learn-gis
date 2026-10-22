# learn-gis — 技术规格（Spec）

> v0.2 · 已按 `F:/Codes/Products/ink_template` 的实际架构对齐（Next 16.3.2 / React 19.2.8 / app 根目录 / Neon + Drizzle）。
> 与模板的**差异点**在第 9 节单列，其余沿用模板约定。

---

## 1. 架构总览

```
浏览器
 └─ Next.js 16 App Router（RSC 为主，答题交互为 client component）
     ├─ 内容层  content/**（JSON 题库 + MDX 讲义）→ 构建期 Zod 校验
     ├─ 引擎层  lib/quiz/*（纯 TS：出题/判卷/SM-2，不 import React）
     ├─ 存储层  ProgressStore 接口 → NeonAdapter（主）+ LocalAdapter（无 DATABASE_URL 时降级）
     └─ 展示层  app/** + components/**（Tailwind 设计令牌）
部署 Vercel（Node 22.x），内容路由可静态生成
```

原则：引擎与 UI 分离、内容即数据、无 JS 也能读讲义。

---

## 2. 目录结构（当前实现）

```
learn-gis/
├─ app/
│  ├─ layout.tsx                # metadata / JSON-LD / ThemeProvider / Sidebar + 移动端 tab
│  ├─ page.tsx                  # 技能总览 + 章节入口
│  ├─ globals.css               # 设计令牌（brand / surface / status + prose）
│  ├─ icon.svg  robots.ts  sitemap.ts
│  ├─ s/[skill]/page.tsx
│  ├─ s/[skill]/[module]/page.tsx
│  ├─ s/[skill]/[module]/quiz/page.tsx
│  ├─ exam/page.tsx             # 考试入口（选卷开考）
│  ├─ review/page.tsx           # M3 接复习队列
│  ├─ progress/page.tsx         # M3 接真实掌握度
│  └─ settings/page.tsx         # 外观 + 次级入口（复习/进度/章节）
├─ components/
│  ├─ Sidebar.tsx / MobileTabBar.tsx / nav.tsx / SiteHeader.tsx / SiteFooter.tsx
│  ├─ ThemeProvider.tsx / ThemeToggle.tsx
│  ├─ quiz/{QuizRunner,QuestionView,ChoiceList,AnswerFeedback,ResultSummary,ProgressBar}.tsx
│  └─ ui/button.tsx             # Radix Slot + cva
├─ content/
│  ├─ schema.ts                 # Zod 唯一事实源
│  ├─ schema.test.ts / registry.test.ts
│  └─ gis/
│     ├─ modules.ts             # 章节元数据（已上线 / 待上线）
│     ├─ questions.ts           # 题库注册表（显式 import）
│     ├─ lessons.ts             # MDX 注册表（显式动态 import）
│     ├─ 00-geo-math.mdx / .questions.json        # 预备知识：坐标 / 角度 / 弧度 / 经纬度
│     ├─ 01-basics.mdx / .questions.json
│     └─ … 02~06 同构
├─ db/
│  ├─ index.ts                  # 惰性 drizzle 连接（无 DATABASE_URL 也能构建）
│  └─ schema.ts                 # pgSchema("learn") + 三张表
├─ lib/
│  ├─ content.ts                # 载入 + 校验 + 缓存
│  ├─ site.ts  utils.ts
│  └─ quiz/{types,grade,schedule,reducer}.ts
├─ app/
│  ├─ favicon.ico / icon.png / apple-icon.png   # 品牌图标（npm run icons 生成）
│  └─ …
├─ public/brand/logo.png        # 站内 logo（128×128，透明底）
├─ scripts/
│  ├─ generate-icons.mjs        # 源图 → favicon / 图标 / logo
│  ├─ validate-content.ts       # prebuild 校验
│  ├─ smoke-quiz.mjs            # 真实 Chrome 跑完全部章节
│  └─ check-overflow.mjs        # 320/375/390 横向溢出
└─ drizzle.config.ts  next.config.mjs  tailwind.config.ts  tsconfig.json …
```

---

## 3. 数据模型

```ts
// content/schema.ts —— Zod 定义，类型由 z.infer 导出
type Ref = { title: string; url: string };
type Option = { key: string; text: string; hint?: string };   // hint = 干扰项级解释

type Base = {
  id: string;            // 'gis-01-001'，稳定不可复用
  skill: string;         // 'gis'
  module: string;        // '01'
  difficulty: 1 | 2 | 3;
  stem: string;
  explanation: string;   // 必填，答错/答对都要讲清
  refs: Ref[];           // 非空，权威来源
};

type ChoiceQuestion = Base & { type: 'single' | 'multi'; options: Option[]; answer: string[] };
type ShortQuestion  = Base & { type: 'short'; accepted: string[]; placeholder?: string };
type Question = ChoiceQuestion | ShortQuestion;

type QuestionFile = { skill: string; module: string; version: number; questions: Question[] };
```

构建期校验（`scripts/validate-content.ts`，`prebuild` 执行）：JSON 可解析、schema 合法、题目 id 唯一、`answer` ⊆ `options`、单选恰好 1 个答案 / 多选 ≥ 2、refs 非空。**校验失败 = build 失败**。

运行时进度（Neon，schema `learn`；匿名 `device_id` 维度，v1 无账号）：

```ts
module_progress  (device_id, skill, module_slug, best_score, last_score, attempts, completed_at, updated_at)
review_cards     (device_id, question_id, ease, interval_days, reps, lapses, due_at, last_reviewed_at)
attempts         (device_id, question_id, module_slug, correct, created_at)
```

v1 直接写 Neon；仍保留 `ProgressStore` 接口，缺 `DATABASE_URL` 时降级到 localStorage，UI 零改动。决策见第 10 节。

---

## 4. 引擎（`lib/quiz/*`，纯 TS，不 import React）

- `grade(question, response)`：单选严格相等；多选按集合相等（无部分分）；`short` 走规范化（trim / 小写 / 全角转半角 / 压缩空格）+ 可接受答案数组。
- `createSession(questions)` / `sessionReducer`：`answering → revealed → finished`；重复 submit 与提前 next 被忽略（竞态安全）。
- `summarize(state)`：total / answered / correct / accuracy / mastery(0–100) / wrongIds。
- `schedule(card, correct)`：SM-2 简化（对 q=4 / 错 q=2），间隔 1 → 6 → interval×ease，答错重置 1 天，ease 下限 1.3。
- `isDue(dueAt, now)`：复习到期判断，非法时间按到期处理。

全部由 Vitest 覆盖（54 个用例，含内容注册表与题库 schema）。

---

## 5. 路由与渲染策略

| 路由 | 渲染 | 说明 |
|---|---|---|
| `/` | static | 介绍 + 统计 + 快捷入口（章节列表在 `/s/gis`，不在首页展开） |
| `/s/[skill]` | SSG (`generateStaticParams`) | 章节列表 + 题量 |
| `/s/[skill]/[module]` | SSG | MDX 讲义（RSC 直出）+ "开始测验" |
| `/s/[skill]/[module]/quiz` | SSG + client 交互 | 单题一屏，键盘 1-4 / Enter，判卷在浏览器内 |
| `/exam` | static | 考试入口：按章选卷 + 综合卷占位 |
| `/review` | static（M3 接队列） | 今日到期题 |
| `/progress` | static（M3 接数据） | 各章掌握度 |
| `/settings` | static | 外观主题 + 次级入口（复习 / 进度 / 章节） |

Next 16 注意：`params` 是 `Promise`，页面签名 `async function Page({ params }: { params: Promise<{ skill: string }> })`。

---

## 6. 版本锁定（照模板 + 补齐）

| 项 | 做法 |
|---|---|
| 模板一致 | `next`、`react`、`react-dom` **精确版本**（16.3.2 / 19.2.8）；其余依赖与模板同策略 `^`；提交 `package-lock.json` |
| 安装 | `npm ci`（CI 与 Vercel），不用 pnpm/yarn 混用 |
| Node | 新增 `.nvmrc` = `22` + `package.json` `engines.node: ">=22.19 <23"`；Vercel 项目设置固定 22.x（模板无此项，属改进） |
| 新增依赖 | 一律同 Next 16 / React 19 兼容线：`@next/mdx`+`@mdx-js/loader`、`zod`、`leaflet`、`maplibre-gl`、`@turf/turf`（按需，v1 可能只要 leaflet）；安装后立即锁精确版本 |
| 校验 | `typecheck` = `tsc --noEmit`，`lint` = `eslint .`，`prebuild` = 内容校验 |
| 脚本 | `"dev": "next dev -p 24000"`（沿用模板端口约定）、`"build"`、`"start"`、`"db:push"`、`"db:seed"` |
| 更新 | 依赖升级单独 PR，CI 绿再合 |

`next.config.mjs` 沿用模板的 `reactStrictMode` + `experimental.turbopackFileSystemCacheForBuild: false`；`headers()` 只在需要静态资源缓存时加。

---

## 7. 质量预算

- 首屏 JS（不含地图路由）< 120 KB gzip；`leaflet`/`maplibre-gl` 只在 map 组件 `dynamic(() => import(...), { ssr: false })`。
- 题库按模块拆 JSON，答题页只加载当前模块。
- Lighthouse 移动端：Perf ≥ 95 / A11y ≥ 95 / SEO ≥ 95。
- TS strict、禁 `any`；单测覆盖 grade/schedule/reducer/schema；Playwright 冒烟：首页 → 模块 → 答 1 题 → 结果页。
- a11y：`fieldset/legend`、radio/checkbox 可聚焦、反馈区 `aria-live="polite"`、全键盘可用。

---

## 8. 部署（Vercel）

- GitHub `main` 自动生产，PR 预览（仓库已有 origin `git@github.com:SongFuZhen/learn-gis.git`）。
- 环境变量：`DATABASE_URL`（v1.5 起）、`NEXT_PUBLIC_SITE_URL`；`.env.example` 只列清单（照模板）。
- 内容更新 = PR 改 JSON/MDX → 重建。
- `@vercel/analytics` 接入（照模板）。

---

## 9. 与 ink_template 的差异（需要你知情）

1. **MDX 讲义**：模板没有 MDX，需新增 `@next/mdx` + `@mdx-js/loader`（精确版本）。若不想加依赖，退路是讲义写成 TSX 或结构化 JSON。
2. **数据库命名空间**：模板 `pgSchema("ink")` → 本项目 `pgSchema("learn")`，同一 Neon 实例可共存。
3. **新增 `.nvmrc` / `engines`**：模板没有，属版本锁定补强。
4. **不照搬的部分**：字体子集化脚本、PDF/拍照评分、Resend 反馈、admin 鉴权——与学习场景无关，v1 不引入。
5. **保留的部分**：ThemeProvider/ThemeToggle/SiteHeader/SiteFooter、`cn()`、设计令牌式 Tailwind、`lib/queries.ts` 的缓存习惯、`scripts/` + tsx。

---

## 10. 已确认决策（解锁 M0）

1. **形态**：题库驱动（A）。引擎侧保留 `QuestionSource` 接口，v2 接 LLM 不改 UI。
2. **进度存储**：Neon + Drizzle，`pgSchema("learn")`（不落 `public`），并保留 `ProgressStore` 接口 + `LocalAdapter` 作为无 `DATABASE_URL` 时的降级实现。
3. **讲义**：MDX（`@next/mdx` + `@mdx-js/loader`，精确版本）；`content/schema.ts` 仍用 Zod 校验题库 JSON。
4. **题库**：按章节分批产出（每章讲义 1 + 题 15~20 + refs），先试点 10 题过 review 再放量。
5. **环境**：Node 22.22.0 / npm 10.9.4 / Git Bash 可用，脚手架与安装由 agent 执行。
