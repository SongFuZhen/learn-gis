/**
 * 课程目录/落地页的统计与进度聚合（服务器端）。
 * 题库统计复用 lib/content.ts 的校验加载器；进度复用 lib/progress/home.ts，
 * 无 cookie 或 DB 不可用时进度返回 null，页面必须能回落纯静态渲染。
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { SKILL_REGISTRY } from "@/content/registry";
import { getModules, getQuestionFile } from "@/lib/content";
import { getHomeData, type HomeData } from "@/lib/progress/home";
import { PASS_LINE } from "@/lib/quiz/exam";

export type SkillStats = {
  /** 已上线章节数 */
  chapters: number;
  /** 题库总题数 */
  questions: number;
  /** 已有音频 manifest 的章节数 */
  audioChapters: number;
};

/** 单门课的内容统计；未知技能返回零值 */
export function getSkillStats(skillId: string): SkillStats {
  const registration = SKILL_REGISTRY.find((r) => r.id === skillId);
  const modules = getModules(skillId);
  const questions = modules.reduce(
    (sum, m) => sum + getQuestionFile(skillId, m.slug).questions.length,
    0,
  );
  const audioChapters = registration
    ? registration.modules.filter((m) =>
        existsSync(
          path.join(process.cwd(), "public", "audio", m.file, "manifest.json"),
        ),
      ).length
    : 0;
  return { chapters: modules.length, questions, audioChapters };
}

export type SkillProgress = {
  /** 章节总数（已上线） */
  total: number;
  /** 已通关章节数（mastery >= PASS_LINE） */
  passed: number;
  /** 学习中（答过题但未通关） */
  learning: number;
  /** 未开始 */
  notStarted: number;
  /** 已测章节平均掌握度，未测为 null */
  avgMastery: number | null;
  /** 通关百分比 0~100（按章节计） */
  completion: number;
};

/**
 * 全课程进度映射，key 为 skill id。
 * 新访客/DB 异常返回 null —— 调用方按「全部未开始」渲染。
 * 已有 HomeData 时传入复用，避免同请求内重复查库。
 */
export async function getSkillProgressMap(
  home?: HomeData | null,
): Promise<Record<string, SkillProgress> | null> {
  const data = home ?? (await getHomeData());
  if (!data) return null;

  const map: Record<string, SkillProgress> = {};
  for (const registration of SKILL_REGISTRY) {
    const total = registration.modules.length;
    const rows = data.chapters.filter((c) => c.skill === registration.id);
    const bySlug = new Map(rows.map((c) => [c.slug, c]));

    let passed = 0;
    let learning = 0;
    let masterySum = 0;
    let masteryCount = 0;

    for (const m of registration.modules) {
      const row = bySlug.get(m.slug);
      if (row && row.quizCount > 0) {
        if (row.mastery >= PASS_LINE) passed += 1;
        else learning += 1;
        masterySum += row.mastery;
        masteryCount += 1;
      }
    }

    map[registration.id] = {
      total,
      passed,
      learning,
      notStarted: total - passed - learning,
      avgMastery: masteryCount ? masterySum / masteryCount : null,
      completion: total ? Math.round((passed / total) * 100) : 0,
    };
  }
  return map;
}

/**
 * 落地页主 CTA 目标：第一个未通关章节（学习中优先，其次未开始），
 * 全通关或无进度数据时回落第一章。
 */
export function getContinueSlug(
  skillId: string,
  homeChapters?: { slug: string; mastery: number; quizCount: number }[],
): string {
  const modules = getModules(skillId);
  if (modules.length === 0) return "";
  if (!homeChapters) return modules[0]!.slug;

  const bySlug = new Map(homeChapters.map((c) => [c.slug, c]));
  const firstLearning = modules.find((m) => {
    const row = bySlug.get(m.slug);
    return row && row.quizCount > 0 && row.mastery < PASS_LINE;
  });
  if (firstLearning) return firstLearning.slug;

  const firstNotStarted = modules.find((m) => {
    const row = bySlug.get(m.slug);
    return !row || row.quizCount === 0;
  });
  return (firstNotStarted ?? modules[0]!).slug;
}
