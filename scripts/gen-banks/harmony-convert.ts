/**
 * 鸿蒙题库一次性转换脚本：
 * 读 HarmonyOS_Chat/question-bank 的 20 个判断题库（1600 题，无 refs、id 规则不兼容），
 * 按 8 章映射精选判断题，改写为本站 questionFileSchema 形状：
 *  - id 重编为 harmony-NN-NNN
 *  - difficulty 1..4 收敛到本站 1..3
 *  - 补权威 refs（仅限 LEARNING_ROADMAP.md 中出现过的官方文档 URL）
 *  - 全局去重，同一源题不跨章重复
 *
 * 用法：npx tsx scripts/gen-banks/harmony-convert.ts
 * 输出：content/harmony/NN-*.questions.json（每章 8 道判断，剩余 4 道选择/多选由人工补写）
 */
import fs from "node:fs";
import path from "node:path";

const SRC_DIR = "F:/HarmonyOS/Codes/HarmonyOS_Chat/question-bank";
const OUT_DIR = path.join(process.cwd(), "content", "harmony");

type SrcQuestion = {
  id: string;
  stem: string;
  answer: boolean;
  explanation: string;
  tag: string;
  difficulty: number;
};

type ChapterPlan = {
  slug: string;
  file: string;
  title: string;
  /** 源题库文件名（按优先级顺序） */
  sources: string[];
  refs: { title: string; url: string }[];
};

const DOC = "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides";
const REF = "https://developer.huawei.com/consumer/cn/doc/harmonyos-references";

const CHAPTERS: ChapterPlan[] = [
  {
    slug: "00",
    file: "00-cognitive-map",
    title: "认知地图：鸿蒙生态与 Stage 模型",
    sources: ["01-arkts-language.json"],
    refs: [
      {
        title: "ArkTS 开发入门",
        url: "https://developer.huawei.com/consumer/cn/arkts/devstart/",
      },
      {
        title: "从 TypeScript 到 ArkTS 的适配规则",
        url: `${DOC}/typescript-to-arkts-migration-guide`,
      },
    ],
  },
  {
    slug: "01",
    file: "01-env-project",
    title: "环境与工程结构：DevEco 与 Stage 模型",
    sources: ["13-build-deps.json", "16-engineering.json"],
    refs: [
      {
        title: "构建第一个 HarmonyOS 应用（ArkTS）",
        url: `${DOC}/start-with-ets-stage`,
      },
    ],
  },
  {
    slug: "02",
    file: "02-arkui-declarative",
    title: "ArkUI 声明式 UI：组件、布局与构建函数",
    sources: ["02-arkui-basics.json", "17-arkui-advanced.json"],
    refs: [
      { title: "ArkUI 基本语法概述", url: `${DOC}/arkts-basic-syntax-overview` },
      { title: "声明式 UI 描述", url: `${DOC}/arkts-declarative-ui-description` },
      { title: "创建自定义组件", url: `${DOC}/arkts-create-custom-components` },
    ],
  },
  {
    slug: "03",
    file: "03-state-management",
    title: "状态管理 V1/V2：装饰器与不刷新排查",
    sources: [
      "03-state-v1.json",
      "04-state-v2.json",
      "18-ui-state-pitfalls.json",
    ],
    refs: [
      { title: "状态管理概述", url: `${DOC}/arkts-state-management-overview` },
      { title: "@State：组件内状态", url: `${REF}/ts-state-management-state` },
      {
        title: "状态变量不刷新的常见排查",
        url: `${DOC}/troubleshooting-state-manage`,
      },
    ],
  },
  {
    slug: "04",
    file: "04-navigation",
    title: "页面路由 Navigation：NavPathStack 与生命周期",
    sources: ["05-navigation.json", "08-lifecycle.json"],
    refs: [
      {
        title: "Navigation 基础架构介绍",
        url: `${DOC}/arkts-navigation-architecture`,
      },
      { title: "Navigation 页面路由", url: `${DOC}/arkts-navigation-jump` },
      { title: "页面路由 router（不推荐）", url: `${DOC}/arkts-routing` },
    ],
  },
  {
    slug: "05",
    file: "05-network-async",
    title: "网络与异步：HTTP、WebSocket 与 TaskPool",
    sources: ["06-network.json", "12-async.json", "11-concurrency.json"],
    refs: [
      { title: "发起 HTTP 数据请求", url: `${DOC}/http-request` },
      { title: "WebSocket 连接", url: `${REF}/js-apis-websocket` },
    ],
  },
  {
    slug: "06",
    file: "06-persistence-lifecycle",
    title: "数据持久化与 UIAbility 生命周期",
    sources: ["07-persistence.json", "08-lifecycle.json"],
    refs: [
      {
        title: "通过用户首选项实现数据持久化",
        url: `${DOC}/data-persistence-by-preferences`,
      },
      {
        title: "通过关系型数据库实现数据持久化",
        url: `${DOC}/data-persistence-by-rdb-store`,
      },
    ],
  },
  {
    slug: "07",
    file: "07-polish-practice",
    title: "性能、安全、动画与综合实战",
    sources: [
      "09-performance.json",
      "14-animation-media.json",
      "15-testing.json",
      "10-security.json",
      "19-web-components.json",
      "20-mixed-battle.json",
    ],
    refs: [
      {
        title: "状态变量不刷新的常见排查",
        url: `${DOC}/troubleshooting-state-manage`,
      },
      {
        title: "构建第一个 HarmonyOS 应用（ArkTS）",
        url: `${DOC}/start-with-ets-stage`,
      },
    ],
  },
];

const TF_PER_CHAPTER = 8;
const usedIds = new Set<string>();

function loadBank(name: string): SrcQuestion[] {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, name), "utf8")) as {
    questions: SrcQuestion[];
  };
  return raw.questions;
}

/** 按 tag 轮转抽题，保证覆盖面，确定性结果 */
function pickRotating(pool: SrcQuestion[], count: number): SrcQuestion[] {
  const byTag = new Map<string, SrcQuestion[]>();
  for (const q of pool) {
    if (usedIds.has(q.id)) continue;
    const list = byTag.get(q.tag) ?? [];
    list.push(q);
    byTag.set(q.tag, list);
  }
  const tags = [...byTag.keys()].sort();
  const cursors = new Map(tags.map((t) => [t, 0]));
  const picked: SrcQuestion[] = [];
  while (picked.length < count) {
    let progressed = false;
    for (const tag of tags) {
      const list = byTag.get(tag)!;
      const cursor = cursors.get(tag)!;
      if (cursor >= list.length) continue;
      const q = list[cursor];
      if (!q) continue;
      cursors.set(tag, cursor + 1);
      if (usedIds.has(q.id)) continue;
      usedIds.add(q.id);
      picked.push(q);
      progressed = true;
      if (picked.length >= count) break;
    }
    if (!progressed) break;
  }
  return picked;
}

function convert(chapter: ChapterPlan) {
  const pool: SrcQuestion[] = chapter.sources.flatMap(loadBank);
  const picked = pickRotating(pool, TF_PER_CHAPTER);
  if (picked.length < TF_PER_CHAPTER) {
    throw new Error(`${chapter.file} 题源不足：仅 ${picked.length}`);
  }
  const questions = picked.map((q, i) => ({
    id: `harmony-${chapter.slug}-${String(i + 1).padStart(3, "0")}`,
    skill: "harmony",
    module: chapter.slug,
    difficulty: Math.min(q.difficulty, 3) as 1 | 2 | 3,
    stem: q.stem,
    explanation: q.explanation,
    refs: chapter.refs,
    type: "truefalse" as const,
    answer: q.answer,
  }));
  const out = {
    skill: "harmony",
    module: chapter.slug,
    version: 1,
    questions,
  };
  const outPath = path.join(OUT_DIR, `${chapter.file}.questions.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(
    `${outPath}  ${questions.length} 题（来源 ${chapter.sources.join(", ")}）`,
  );
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const chapter of CHAPTERS) convert(chapter);
console.log(`完成：${CHAPTERS.length} 章 × ${TF_PER_CHAPTER} 判断，待补选择/多选各章 4 题`);
