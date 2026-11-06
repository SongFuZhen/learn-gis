import cesiumIntro from "./00-cesium-intro.questions.json";
import cameraCoords from "./01-camera-coords.questions.json";
import imageryLayers from "./02-imagery-layers.questions.json";
import terrain from "./03-terrain.questions.json";

/**
 * 题库注册表：显式 import 让内容进入 bundle 且被 TS 检查，
 * 校验统一走 lib/content.ts（构建期）+ scripts/validate-content.ts（CI）。
 */
const RAW_BY_MODULE: Record<string, unknown> = {
  "00": cesiumIntro,
  "01": cameraCoords,
  "02": imageryLayers,
  "03": terrain,
};

export function rawQuestionsFor(moduleSlug: string): unknown {
  const raw = RAW_BY_MODULE[moduleSlug];
  if (!raw) throw new Error(`模块 ${moduleSlug} 没有题库文件`);
  return raw;
}

/** 仅用于「有哪些模块有题库」的枚举 */
export const MODULE_SLUGS_WITH_QUESTIONS = Object.keys(RAW_BY_MODULE);
