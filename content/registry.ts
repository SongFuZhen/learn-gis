/**
 * 技能注册表：所有技能（gis / cesium / …）在这里汇总。
 * 注意：本文件不得 import MDX（scripts 也引用它）；
 * 讲义加载器在 lib/content.ts 的 LESSON_LOADERS（服务器端专用）。
 */
import type { ModuleMeta } from "./types";
import { GIS_MODULES, PLANNED_MODULES as GIS_PLANNED } from "./gis/modules";
import { rawQuestionsFor as gisRawQuestions } from "./gis/questions";
import {
  CESIUM_MODULES,
  PLANNED_MODULES as CESIUM_PLANNED,
} from "./cesium/modules";
import { rawQuestionsFor as cesiumRawQuestions } from "./cesium/questions";

export type SkillRegistration = {
  /** 技能 id，用于 URL /s/<id>/ */
  id: string;
  /** content/<dir>/ 目录名（题库文件所在） */
  dir: string;
  /** 已上线章节 */
  modules: ModuleMeta[];
  /** 已规划未上线章节 */
  plannedModules: { slug: string; title: string }[];
  /** 题库原始数据（lib/content.ts 校验后使用） */
  rawQuestionsFor(moduleSlug: string): unknown;
};

export const SKILL_REGISTRY: SkillRegistration[] = [
  {
    id: "gis",
    dir: "gis",
    modules: GIS_MODULES,
    plannedModules: GIS_PLANNED,
    rawQuestionsFor: gisRawQuestions,
  },
  {
    id: "cesium",
    dir: "cesium",
    modules: CESIUM_MODULES,
    plannedModules: CESIUM_PLANNED,
    rawQuestionsFor: cesiumRawQuestions,
  },
];

/** 按技能 id 查注册表条目 */
export function getSkillRegistration(
  skillId: string,
): SkillRegistration | null {
  return SKILL_REGISTRY.find((r) => r.id === skillId) ?? null;
}
