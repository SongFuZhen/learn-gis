/**
 * 技能注册表：所有技能（gis / cesium / …）在这里汇总。
 * 注意：本文件不得 import MDX（scripts 也引用它）；
 * 讲义加载器在 lib/content.ts 的 LESSON_LOADERS（服务器端专用）。
 */
import type { ModuleMeta, SkillTrack } from "./types";
import { GIS_MODULES, PLANNED_MODULES as GIS_PLANNED } from "./gis/modules";
import { rawQuestionsFor as gisRawQuestions } from "./gis/questions";
import {
  CESIUM_MODULES,
  PLANNED_MODULES as CESIUM_PLANNED,
} from "./cesium/modules";
import { rawQuestionsFor as cesiumRawQuestions } from "./cesium/questions";

/** lucide 图标名（UI 层在 content/icons.ts 映射为组件；registry 被 node 脚本引用，不引 React） */
export type SkillIconName = "Map" | "Globe" | "Boxes" | "Box" | "Smartphone";

export type SkillRegistration = {
  /** 技能 id，用于 URL /s/<id>/ */
  id: string;
  /** content/<dir>/ 目录名（题库文件所在） */
  dir: string;
  /** 展示名与一句话介绍（lib/content.ts 的 SKILLS 由这里派生） */
  title: string;
  description: string;
  /** 课程轨道，/learn 按轨道分组 */
  track: SkillTrack;
  /** lucide 图标名，映射见 content/icons.ts */
  icon: SkillIconName;
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
    title: "GIS 基础",
    description:
      "从坐标与经纬度的数学打底讲起：基准面、投影、数据模型、格式、OGC 服务、空间运算与 PostGIS。",
    track: "geospatial",
    icon: "Map",
    modules: GIS_MODULES,
    plannedModules: GIS_PLANNED,
    rawQuestionsFor: gisRawQuestions,
  },
  {
    id: "cesium",
    dir: "cesium",
    title: "CesiumJS 三维地球",
    description:
      "从零到一学会 CesiumJS：Viewer、相机与坐标系、影像与地形、Entity 与 CZML、3D Tiles、拾取交互、空间量算与性能优化，全程免 ion token 示例。",
    track: "geospatial",
    icon: "Globe",
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
