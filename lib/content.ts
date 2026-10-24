import {
  formatIssues,
  questionFileSchema,
  type QuestionFile,
} from "@/content/schema";
import { GIS_MODULES, type ModuleMeta } from "@/content/gis/modules";
import { rawQuestionsFor } from "@/content/gis/questions";
import { loadLesson } from "@/content/gis/lessons";

/**
 * 内容载入 + 构建期校验。
 * 校验失败直接抛错，让 `next build` 在静态生成阶段失败（内容即数据，坏数据不上线）。
 */

export type Skill = {
  id: string;
  title: string;
  description: string;
};

export const SKILLS: Skill[] = [
  {
    id: "gis",
    title: "GIS 基础",
    description:
      "从坐标与经纬度的数学打底讲起：基准面、投影、数据模型、格式、OGC 服务、空间运算与 PostGIS。",
  },
];

export function getSkill(skillId: string): Skill | null {
  return SKILLS.find((s) => s.id === skillId) ?? null;
}

/** 展示用章节序号：内部 slug 从 00 起，展示一律从 01 起 */
export function chapterNo(slug: string): string {
  return String(Number(slug) + 1).padStart(2, "0");
}

export function getModules(skillId: string): ModuleMeta[] {
  if (skillId !== "gis") return [];
  return GIS_MODULES;
}

export function getModule(
  skillId: string,
  moduleSlug: string,
): ModuleMeta | null {
  return getModules(skillId).find((m) => m.slug === moduleSlug) ?? null;
}

const validated = new Map<string, QuestionFile>();

/** 读取并校验一个模块的题库（模块内缓存，避免重复 parse） */
export function getQuestionFile(
  skillId: string,
  moduleSlug: string,
): QuestionFile {
  const key = `${skillId}:${moduleSlug}`;
  const cached = validated.get(key);
  if (cached) return cached;

  const meta = getModule(skillId, moduleSlug);
  if (!meta) throw new Error(`未知模块：${skillId}/${moduleSlug}`);

  const parsed = questionFileSchema.safeParse(rawQuestionsFor(moduleSlug));
  if (!parsed.success) {
    throw new Error(
      `题库校验失败 ${meta.file}.questions.json\n${formatIssues(parsed.error)}`,
    );
  }
  validated.set(key, parsed.data);
  return parsed.data;
}

export function getQuestions(skillId: string, moduleSlug: string) {
  return getQuestionFile(skillId, moduleSlug).questions;
}

/** 按题目 id 反查（复习队列用） */
export function findQuestion(questionId: string) {
  for (const moduleMeta of GIS_MODULES) {
    const file = getQuestionFile("gis", moduleMeta.slug);
    const hit = file.questions.find((q) => q.id === questionId);
    if (hit) return hit;
  }
  return null;
}

export async function getLesson(skillId: string, moduleSlug: string) {
  const meta = getModule(skillId, moduleSlug);
  if (!meta) return null;
  return loadLesson(meta.file);
}
