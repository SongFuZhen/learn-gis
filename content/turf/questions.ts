import turfIntro from "./00-turf-intro.questions.json";
import measurement from "./01-measurement.questions.json";
import bearingDestination from "./02-bearing-destination.questions.json";
import bufferTransform from "./03-buffer-transform.questions.json";
import booleanJoins from "./04-boolean-joins.questions.json";
import pointPolygonVoronoi from "./05-point-polygon-voronoi.questions.json";
import aggregation from "./06-aggregation.questions.json";
import interpolationRandom from "./07-interpolation-random.questions.json";
import leafletMaplibre from "./08-leaflet-maplibre.questions.json";
import performanceData from "./09-performance-data.questions.json";

/**
 * 题库注册表：显式 import 让内容进入 bundle 且被 TS 检查，
 * 校验统一走 lib/content.ts（构建期）+ scripts/validate-content.ts（CI）。
 */
const RAW_BY_MODULE: Record<string, unknown> = {
  "00": turfIntro,
  "01": measurement,
  "02": bearingDestination,
  "03": bufferTransform,
  "04": booleanJoins,
  "05": pointPolygonVoronoi,
  "06": aggregation,
  "07": interpolationRandom,
  "08": leafletMaplibre,
  "09": performanceData,
};

export function rawQuestionsFor(moduleSlug: string): unknown {
  const raw = RAW_BY_MODULE[moduleSlug];
  if (!raw) throw new Error(`模块 ${moduleSlug} 没有题库文件`);
  return raw;
}

/** 仅用于「有哪些模块有题库」的枚举 */
export const MODULE_SLUGS_WITH_QUESTIONS = Object.keys(RAW_BY_MODULE);
