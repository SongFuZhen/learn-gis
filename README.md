# learn-gis

以问答驱动、从 0 学任何技能的学习应用；第一个技能包是 **GIS**。

- 产品计划：`docs/PLAN.md`
- 技术规格：`docs/SPEC.md`
- 学习资料池：`docs/RESOURCES.md`
- 设计规范：`docs/DESIGN.md`

## 技术栈

Next.js 16.3.2（App Router，`app/` 在根目录）· React 19.2.8 · TypeScript strict ·
Tailwind 3.4（CSS 变量设计令牌）· next-themes · MDX（`@next/mdx`）· Zod ·
Neon + Drizzle（`learn` schema）· Vitest · Inter（本地打包）。

## 本地开发

```bash
nvm use            # Node 22（见 .nvmrc）
npm ci
cp .env.example .env.local   # 填 DATABASE_URL（可留空，构建仍可通过）
npm run dev        # http://localhost:25000
```

常用脚本：

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器（25000，避免与 ink_template 的 24000 冲突） |
| `npm run build` | 生产构建 |
| `npm run lint` / `npm run typecheck` | 静态检查 |
| `npm test` | Vitest 单测（引擎层 + 内容校验，54 例） |
| `npm run verify` | lint → typecheck → test → build 全链路 |
| `npm run content:validate` | 题库 Zod 校验（`prebuild` 自动执行） |
| `npm run smoke:quiz` | 真实 Chrome 跑完 6 章 85 题（需 dev/preview 已启动，`BASE_URL` 可覆盖） |
| `npm run check:overflow` | 320/375/390px 三档横向溢出检查 |
| `npm run db:push` | 推送 Drizzle schema 到 Neon（`learn` schema） |

## 进度

- [x] **M0** 脚手架：Next 16 + TS strict + Tailwind + 锁版 lockfile、`.nvmrc`、CI（lint / typecheck / test / build）、设计令牌、站点壳、`learn` schema 定义
- [x] **M1** 引擎：`content/schema.ts`（Zod）+ 试点 10 题 + 答题状态机 + 结果页 + 单测 + 真实浏览器冒烟
- [x] **M2** 内容：GIS 6 章 MDX 讲义 + 85 题（每章 10~15 题）+ refs
- [ ] **M3** 复习：`ProgressStore`（Neon + 本地降级）+ SM-2 队列 + 今日复习页
- [ ] **M4** 地图题：交互地图组件（动态加载）+ MDX 内嵌示例
- [ ] **M5** 打磨：a11y、深色模式、Lighthouse ≥ 95（设计规范见 `docs/DESIGN.md`）
