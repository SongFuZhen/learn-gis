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
import {
  TURF_MODULES,
  PLANNED_MODULES as TURF_PLANNED,
} from "./turf/modules";
import { rawQuestionsFor as turfRawQuestions } from "./turf/questions";
import {
  THREE_MODULES,
  PLANNED_MODULES as THREE_PLANNED,
} from "./three/modules";
import { rawQuestionsFor as threeRawQuestions } from "./three/questions";
import {
  HARMONY_MODULES,
  PLANNED_MODULES as HARMONY_PLANNED,
} from "./harmony/modules";
import { rawQuestionsFor as harmonyRawQuestions } from "./harmony/questions";

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
  /** 难度档位（课程目录/落地页展示） */
  difficulty: "入门" | "进阶" | "实战";
  /** 预计学时（小时，按章节内容估算） */
  estimatedHours: number;
  /** 课程落地页「你将学会」条目，3~5 条 */
  objectives: string[];
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
    difficulty: "入门",
    estimatedHours: 12,
    objectives: [
      "坐标系、基准面与地图投影的数学原理",
      "矢量与栅格数据模型、GeoJSON 等常见格式",
      "EPSG 空间参考与 OGC 地图服务",
      "PostGIS 空间查询与常用空间运算",
    ],
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
    difficulty: "进阶",
    estimatedHours: 12,
    objectives: [
      "Viewer、相机与 Cesium 坐标系基础",
      "免 ion token 加载影像与地形",
      "Entity、CZML 与 3D Tiles 数据表达",
      "拾取交互、空间量算与渲染性能优化",
    ],
    modules: CESIUM_MODULES,
    plannedModules: CESIUM_PLANNED,
    rawQuestionsFor: cesiumRawQuestions,
  },
  {
    id: "turf",
    dir: "turf",
    title: "Turf.js 二维空间运算",
    description:
      "跑在浏览器与 Node 里的几何引擎：量测、缓冲、叠置、点面分析、聚合与插值，GeoJSON 进 GeoJSON 出，配合 Leaflet/MapLibre 完成二维地图应用。",
    track: "geospatial",
    icon: "Boxes",
    difficulty: "进阶",
    estimatedHours: 10,
    objectives: [
      "GeoJSON 几何模型与 Turf 运算范式",
      "量测、缓冲、叠置与点面分析",
      "空间聚合与插值",
      "配合 Leaflet/MapLibre 落地二维地图应用",
    ],
    modules: TURF_MODULES,
    plannedModules: TURF_PLANNED,
    rawQuestionsFor: turfRawQuestions,
  },
  {
    id: "three",
    dir: "three",
    title: "three.js 图形渲染",
    description:
      "通用 WebGL 三维渲染：场景图、相机与渲染循环、几何材质、光照阴影、glTF、拾取、粒子、GLSL 着色器与后处理，最后把 three 场景叠回地理地图。",
    track: "graphics",
    icon: "Box",
    difficulty: "进阶",
    estimatedHours: 14,
    objectives: [
      "场景图、相机与渲染循环",
      "几何、材质、光照阴影与 glTF 加载",
      "拾取、粒子、GLSL 着色器与后处理",
      "把 three 三维场景叠回地理地图",
    ],
    modules: THREE_MODULES,
    plannedModules: THREE_PLANNED,
    rawQuestionsFor: threeRawQuestions,
  },
  {
    id: "harmony",
    dir: "harmony",
    title: "HarmonyOS / ArkTS 应用开发",
    description:
      "React 视角学鸿蒙：Stage 模型与工程结构、ArkUI 声明式 UI、状态管理 V1/V2、Navigation 路由、网络与并发、持久化与生命周期、性能安全与综合实战。",
    track: "platform",
    icon: "Smartphone",
    difficulty: "实战",
    estimatedHours: 16,
    objectives: [
      "Stage 模型与 ArkTS 工程结构",
      "ArkUI 声明式 UI 与状态管理 V1/V2",
      "Navigation 路由、网络、并发与持久化",
      "性能、安全与综合实战",
    ],
    modules: HARMONY_MODULES,
    plannedModules: HARMONY_PLANNED,
    rawQuestionsFor: harmonyRawQuestions,
  },
];

/** 按技能 id 查注册表条目 */
export function getSkillRegistration(
  skillId: string,
): SkillRegistration | null {
  return SKILL_REGISTRY.find((r) => r.id === skillId) ?? null;
}
