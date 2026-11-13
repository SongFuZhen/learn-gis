import threeIntro from "./00-three-intro.questions.json";
import sceneCamera from "./01-scene-camera.questions.json";
import geometryMaterial from "./02-geometry-material.questions.json";
import lightShadow from "./03-light-shadow.questions.json";
import textureLoader from "./04-texture-loader.questions.json";
import orbitRaycast from "./05-orbit-raycast.questions.json";
import animation from "./06-animation.questions.json";
import shaderBasics from "./07-shader-basics.questions.json";
import postprocessing from "./08-postprocessing.questions.json";
import geoIntegration from "./09-geo-integration.questions.json";

/**
 * 题库注册表：显式 import 让内容进入 bundle 且被 TS 检查，
 * 校验统一走 lib/content.ts（构建期）+ scripts/validate-content.ts（CI）。
 */
const RAW_BY_MODULE: Record<string, unknown> = {
  "00": threeIntro,
  "01": sceneCamera,
  "02": geometryMaterial,
  "03": lightShadow,
  "04": textureLoader,
  "05": orbitRaycast,
  "06": animation,
  "07": shaderBasics,
  "08": postprocessing,
  "09": geoIntegration,
};

export function rawQuestionsFor(moduleSlug: string): unknown {
  const raw = RAW_BY_MODULE[moduleSlug];
  if (!raw) throw new Error(`模块 ${moduleSlug} 没有题库文件`);
  return raw;
}

/** 仅用于「有哪些模块有题库」的枚举 */
export const MODULE_SLUGS_WITH_QUESTIONS = Object.keys(RAW_BY_MODULE);
