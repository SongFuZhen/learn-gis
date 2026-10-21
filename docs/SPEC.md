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
     ├─ 存储层  ProgressStore 接口 → LocalStoreAdapter(v1) / NeonAdapter(v1.5)
     └─ 展示层  app/** + components/**（Tailwind 设计令牌）
部署 Vercel（Node 22.x），内容路由可静态生成
```

原则：引擎与 UI 分离、内容即数据、无 JS 也能读讲义。

---

## 2. 目录结构（对齐模板约定）

```
learn-gis/
├─ app/
│  ├─ layout.tsx                # metadata / JSON-LD / ThemeProvider / Analytics（照模板）
│  ├─ page.tsx                  # 技能列表 + 今日复习入口
│  ├─ globals.css               # 设计令牌（照模板的 CSS 变量写法）
│  ├─ sitemap.ts
│  ├─ s/[skill]/page.tsx
│  ├─ s/[skill]/[module]/page.tsx
│  ├─ s/[skill]/[module]/quiz/page.tsx     # client
│  ├─ review/page.tsx
│  └─ progress/page.tsx
├─ components/
│  ├─ ThemeProvider.tsx / ThemeToggle.tsx / SiteHeader.tsx / SiteFooter.tsx   # 沿用模板
│  ├─ quiz/{QuizRunner,ChoiceList,AnswerFeedback,ResultSummary,ProgressBar}.tsx
│  ├─ map/{LeafletDemo,MapQuestion}.tsx        # dynamic import, ssr:false
│  └─ ui/                                      # Radix + cva 组合件，按需添加
├─ content/
│  ├─ skills.ts                                # 技能注册表
│  ├─ schema.ts                                # Zod schema（被 scripts 与 app 共用）
│  └─ gis/
│     ├─ 01-basics.mdx  / 01-basics.questions.json
│     └─ ... 共 6 个模块
├─ db/
│  ├─ index.ts                                 # Neon + drizzle client（照模板）
│  └─ schema.ts                                # pgSchema("learn")
├─ lib/
│  ├─ utils.ts                                 # cn()（照模板）
│  ├─ quiz/{types,grade,schedule,reducer,session}.ts
│  ├─ storage/{ProgressStore,localAdapter,neonAdapter}.ts
│  ├─ progress.ts                              # 读进度、派生掌握度
│  └─ content.ts                               # 载入 + 校验题库
├─ scripts/
│  ├─ validate-content.ts                      # prebuild，用 tsx 跑
│  └─ seed-progress.ts
├─ drizzle.config.ts  .env.example  eslint.config.mjs  postcss.config.mjs
├─ tailwind.config.ts  next.config.mjs  tsconfig.json
├─ package.json  package-lock.json  docs/
```

---

## 3. 数据模型

```ts
// content/schema.ts（Zod 唯一事实源，TS 类型由 z.infer 导出）
type Skill   = { id: string; title: string; subtitle: string; accent: string; modules: string[] };
type Module  = { id: string; skillId: string; order: number; title: string;
                 summary: string; estMinutes: number; prereq?: string[]; lesson: string };
type Question = {
  id: string;              // 'gis:01:q003'，稳定不可复用
  moduleId: string;
  type: 'single' | 'multiple' | 'boolean' | 'short' | 'map';
  difficulty: 1 | 2 | 3;
  tags: string[];
  prompt: string;                       // 允许行内 markdown
  code?: string;                        // 代码/JSON 片段
  choices?: { id: string; text: string; explain?: string }[];  // 干扰项级解释
  answer: string | string[];
  explanation: string;
  refs: { label: string; url: string }[];                      // 非空，权威来源
  map?: { center: [number, number]; zoom: number; target: unknown };
};
```

构建期校验（`scripts/validate-content.ts`，`prebuild` 执行）：id 唯一、moduleId 存在、`answer` ⊆ `choices`、refs 非空、难度/type 枚举合法、MDX 文件存在。**校验失败 = build 失败**。

运行时进度（Neon，schema `learn`）：
```ts
// db/schema.ts
export const learn = pgSchema("learn");
export const attempts = learn.table("attempts", {
  id: uuid().defaultRandom().primaryKey(),
  anonId: text("anon_id").notNull(),      // 匿名设备 ID（cookie，无需登录）
  questionId: text("question_id").notNull(),
  moduleId: text("module_id").notNull(),
  correct: boolean().notNull(),
  elapsedMs: integer("elapsed_ms").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const reviewStates = learn.table("review_states", {
  anonId: text("anon_id").notNull(),
  questionId: text("question_id").notNull(),
  ease: real().notNull().default(2.5),
  intervalDays: real("interval_days").notNull().default(0),
  dueAt: timestamp("due_at").notNull(),
  lapses: integer().notNull().default(0),
});   // 复合主键 (anonId, questionId)
```

v1 默认仍写 localStorage（离线可用、零后端成本）；`ProgressStore` 接口保证 v1.5 换 Neon 时 UI 零改动。是否 v1 直接上 Neon，见第 10 节。

---

## 4. 引擎

- `grade(question, response)`：纯函数；多选按集合相等（v1 无部分分）；`short` 走规范化（trim/小写/全角转半角）+ 可接受答案数组。
- `buildSession({ moduleId, mode })`：`practice`（按 order）/ `review`（dueAt ≤ now）/ `exam`（随机 N，结束才给解释）。
- `schedule(state, correct)`：SM-2 简化，`interval *= ease`（正确）/ `interval = 0, ease -= 0.2`（错误，min 1.3）。
- `reducer(state, action)`：`asking → revealed → next → done`，纯 reducer，Vitest 覆盖。

---

## 5. 路由与渲染策略

| 路由 | 渲染 | 说明 |
|---|---|---|
| `/` | static | 技能卡片 + 今日到期题数（client 读进度） |
| `/s/[skill]` | SSG (`generateStaticParams`) | 模块树 + 掌握度（client） |
| `/s/[skill]/[module]` | SSG | MDX 讲义（RSC 直出）+ "开始测验" |
| `/s/[skill]/[module]/quiz` | client | 单题一屏，键盘 1-4 / Enter |
| `/review` | client | 到期题队列 |
| `/progress` | client | 全量统计（按 tag/难度） |

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
