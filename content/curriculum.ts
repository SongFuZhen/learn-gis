/**
 * 机器可读课程清单：从 SKILL_REGISTRY 派生，供 llms.txt 生成、MCP 服务与 AI skill 共用。
 * 本文件保持零 React / 零 MDX 依赖，node 脚本可直接 import。
 */
import { SKILL_REGISTRY } from "./registry";
import { TRACK_LABEL, type SkillTrack } from "./types";

/**
 * 课程级前置依赖（章节内顺序即学习顺序，不另建模）。
 * turf 依赖 gis 的空间数据基础；cesium 同时需要 gis 理论与 turf 的二维工程直觉；
 * three（通用图形）与 harmony（平台开发）各自独立。
 */
const PREREQUISITES: Record<string, string[]> = {
  gis: [],
  turf: ["gis"],
  cesium: ["gis", "turf"],
  three: [],
  harmony: [],
};

export type CurriculumChapter = {
  slug: string;
  file: string;
  title: string;
  summary: string;
  questionCount: number;
};

export type CurriculumSkill = {
  id: string;
  title: string;
  track: SkillTrack;
  trackLabel: string;
  description: string;
  prerequisites: string[];
  chapterCount: number;
  totalQuestions: number;
  chapters: CurriculumChapter[];
};

function buildSkill(
  reg: (typeof SKILL_REGISTRY)[number],
): CurriculumSkill {
  const chapters: CurriculumChapter[] = reg.modules.map((m) => {
    const raw = reg.rawQuestionsFor(m.slug) as
      | { questions?: unknown[] }
      | undefined;
    return {
      slug: m.slug,
      file: m.file,
      title: m.title,
      summary: m.summary,
      questionCount: raw?.questions?.length ?? 0,
    };
  });
  return {
    id: reg.id,
    title: reg.title,
    track: reg.track,
    trackLabel: TRACK_LABEL[reg.track],
    description: reg.description,
    prerequisites: PREREQUISITES[reg.id] ?? [],
    chapterCount: chapters.length,
    totalQuestions: chapters.reduce((sum, c) => sum + c.questionCount, 0),
    chapters,
  };
}

/** 全部课程的机器可读清单（顺序同 registry：gis → cesium → turf → three → harmony） */
export const CURRICULUM: CurriculumSkill[] = SKILL_REGISTRY.map(buildSkill);

export function getCurriculumSkill(skillId: string): CurriculumSkill | null {
  return CURRICULUM.find((s) => s.id === skillId) ?? null;
}
