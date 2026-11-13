---
name: learn-gis-tutor
description: 讲授 learn-gis 站点五门课程（GIS 基础、CesiumJS、Turf.js、three.js、HarmonyOS/ArkTS）的辅导技能。用于按章讲解、抽题测验、根据解析复盘、规划学习路径。只读内容目录，不修改讲义与题库。
---

# learn-gis 辅导技能

## 站点内容布局（事实源）

- `content/registry.ts`：技能注册表 `SKILL_REGISTRY`，五门课 `gis / cesium / turf / three / harmony`，分三轨 `geospatial / graphics / platform`。
- 每门课一个目录 `content/<skill>/`，四件套：
  - `modules.ts`：章节元数据 `{slug, file, title, summary}`，slug 从 `00` 起（展示序号 = slug + 1）。
  - `lessons.ts`：讲义 MDX 的显式动态 import 映射。
  - `questions.ts`：题库 JSON 的 import 映射 + `rawQuestionsFor(slug)`。
  - `all-questions.ts`：该技能全量题目，经 `questionSchema` 模块加载期校验。
- 讲义：`content/<skill>/<file>.mdx`，无 frontmatter（元数据在 modules.ts）。
- 题库：`content/<skill>/<file>.questions.json`，形状 `{skill, module, version, questions[]}`，构建期 zod 校验（`content/schema.ts`），坏数据直接 build 失败。
- 机器可读课程清单：`content/curriculum.ts` 的 `CURRICULUM`（含前置依赖：turf→gis；cesium→gis+turf；three/harmony 独立）。
- 公开课程索引：`public/llms.txt`（`npm run gen:llms` 从 curriculum 生成）。
- MCP 服务：`mcp/server.ts`，工具 `list_skills / list_chapters / get_chapter / get_quiz / search`，`npm run mcp:server` 启动（stdio，只读）。

## 题库强约束（出题/改题必须遵守）

- id 形如 `<skill>-NN-NNN`；`stem` ≥ 6 字、`explanation` ≥ 10 字；每题 `refs` ≥ 1 条权威 URL。
- 题型：`single`（答案 1 个）/ `multi`（≥2）/ `truefalse` / `short` / `numeric` / `map`；选项 key 唯一且答案 key 必须存在。
- 本技能只读：发现内容问题时报告文件路径与题号，不直接改文件。

## 讲义约定

- 每章以 `## 🍼 白话版（先看这个）` 开场，含「一句话经验 / 常见坑 / 必记 3 条」。
- 可用 MDX 组件：`Callout`（info/warn/tip/must/example）、`Exercise` + `ExerciseSolution`、`MapExample`、`ProjPlayground`。
- 英文术语每章首次出现注音（见仓库 CLAUDE.md），代码块与 API 名不注音。
- turf/three 章节含与 Cesium 的对比 Callout；harmony 为独立平台轨，用 React 类比。

## 教学工作流

1. **定位**：读 `content/curriculum.ts` 确定课程与前置依赖；按 `modules.ts` 顺序教学。
2. **备课**：读对应 `*.mdx` 全文；需要背景时沿讲义中的跨课链接（`/s/<skill>/<slug>`）补前置。
3. **讲解**：先用白话版的类比，再按章节顺序展开；术语首次出现保留注音读法。
4. **抽题**：从对应 `.questions.json` 抽题；先不给 `explanation`/`answer`，学员作答后对照 `explanation` 讲为什么。
5. **复盘**：答错时回到 MDX 对应小节，用「常见坑」Callout 强化，再换同章题复测。
6. **学习路径建议**：gis → turf → cesium 为地理空间轨顺序；three 与 harmony 可独立开始。

## 校验与命令（回答工程问题时引用）

- `npm run content:validate`：校验全部题库 schema/归属/id 唯一性。
- `npm run gen:llms`：重新生成 public/llms.txt。
- `npm run mcp:server`：启动只读 MCP 服务。
- `npm run verify`：lint + typecheck + vitest + next build。
- `npm run smoke:quiz` / `smoke:annotations` / `smoke:speech`：回归脚本。
