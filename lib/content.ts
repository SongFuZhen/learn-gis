import type { ComponentType } from "react";
import {
  formatIssues,
  questionFileSchema,
  type QuestionFile,
} from "@/content/schema";
import { getSkillRegistration, SKILL_REGISTRY } from "@/content/registry";
import { loadLesson as loadGisLesson } from "@/content/gis/lessons";
import { loadLesson as loadCesiumLesson } from "@/content/cesium/lessons";
import { loadLesson as loadTurfLesson } from "@/content/turf/lessons";
import { loadLesson as loadThreeLesson } from "@/content/three/lessons";
import { loadLesson as loadHarmonyLesson } from "@/content/harmony/lessons";
import type { ModuleMeta, SkillTrack } from "@/content/types";

/**
 * 内容载入 + 构建期校验（技能数据驱动）。
 * 校验失败直接抛错，让 `next build` 在静态生成阶段失败（内容即数据，坏数据不上线）。
 * 新增技能：在 content/registry.ts 注册 + 在 LESSON_LOADERS 挂讲义加载器。
 */

export type Skill = {
  id: string;
  title: string;
  description: string;
  track: SkillTrack;
};

/** 展示元数据统一由 registry 派生，避免两处维护 */
export const SKILLS: Skill[] = SKILL_REGISTRY.map((r) => ({
  id: r.id,
  title: r.title,
  description: r.description,
  track: r.track,
}));

export function getSkill(skillId: string): Skill | null {
  return SKILLS.find((s) => s.id === skillId) ?? null;
}

/** 展示用章节序号：内部 slug 从 00 起，展示一律从 01 起 */
export function chapterNo(slug: string): string {
  return String(Number(slug) + 1).padStart(2, "0");
}

export function getModules(skillId: string): ModuleMeta[] {
  return getSkillRegistration(skillId)?.modules ?? [];
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

  const registration = getSkillRegistration(skillId);
  if (!registration) throw new Error(`未知技能：${skillId}`);

  const parsed = questionFileSchema.safeParse(
    registration.rawQuestionsFor(moduleSlug),
  );
  if (!parsed.success) {
    throw new Error(
      `题库校验失败 ${meta.file}.questions.json\n${formatIssues(parsed.error)}`,
    );
  }
  if (
    parsed.data.skill !== skillId ||
    parsed.data.module !== moduleSlug
  ) {
    throw new Error(
      `题库归属不符：文件声明 ${parsed.data.skill}/${parsed.data.module}，按 ${skillId}/${moduleSlug} 请求`,
    );
  }
  validated.set(key, parsed.data);
  return parsed.data;
}

export function getQuestions(skillId: string, moduleSlug: string) {
  return getQuestionFile(skillId, moduleSlug).questions;
}

/** 按题目 id 反查（复习队列用）：遍历全部技能的题库 */
export function findQuestion(questionId: string) {
  for (const skill of SKILL_REGISTRY) {
    for (const moduleMeta of skill.modules) {
      const file = getQuestionFile(skill.id, moduleMeta.slug);
      const hit = file.questions.find((q) => q.id === questionId);
      if (hit) return hit;
    }
  }
  return null;
}

/** 讲义加载器：按技能分发到各自的 lessons.ts（服务器端专用，不进 registry.ts） */
const LESSON_LOADERS: Record<
  string,
  (file: string) => Promise<ComponentType | null>
> = {
  gis: loadGisLesson,
  cesium: loadCesiumLesson,
  turf: loadTurfLesson,
  three: loadThreeLesson,
  harmony: loadHarmonyLesson,
};

export async function getLesson(skillId: string, moduleSlug: string) {
  const meta = getModule(skillId, moduleSlug);
  if (!meta) return null;
  const loader = LESSON_LOADERS[skillId];
  if (!loader) return null;
  return loader(meta.file);
}
