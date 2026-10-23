import type { Question } from "@/lib/quiz/types";
import geoMath from "./00-geo-math.questions.json";
import basics from "./01-basics.questions.json";
import projection from "./02-projection.questions.json";
import crsEpsg from "./03-crs-epsg.questions.json";
import vectorRaster from "./04-vector-raster.questions.json";
import formatsTiles from "./05-formats-tiles.questions.json";
import ogcWebmap from "./06-ogc-webmap.questions.json";
import spatialPostgis from "./07-spatial-postgis.questions.json";

/**
 * 题库注册表：显式 import 让内容进入 bundle 且被 TS 检查，
 * 校验统一走 lib/content.ts（构建期）+ scripts/validate-content.ts（CI）。
 */
const RAW_BY_MODULE: Record<string, unknown> = {
  "00": geoMath,
  "01": basics,
  "02": projection,
  "03": crsEpsg,
  "04": vectorRaster,
  "05": formatsTiles,
  "06": ogcWebmap,
  "07": spatialPostgis,
};

export function rawQuestionsFor(moduleSlug: string): unknown {
  const raw = RAW_BY_MODULE[moduleSlug];
  if (!raw) throw new Error(`模块 ${moduleSlug} 没有题库文件`);
  return raw;
}

/** 仅用于「有哪些模块有题库」的枚举 */
export const MODULE_SLUGS_WITH_QUESTIONS = Object.keys(RAW_BY_MODULE);

export type { Question };
