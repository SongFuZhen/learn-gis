import type { Question } from "@/lib/quiz/types";
import geoMath from "./00-geo-math.questions.json";
import basics from "./01-basics.questions.json";
import projection from "./02-projection.questions.json";
import crsEpsg from "./03-crs-epsg.questions.json";
import vectorRaster from "./04-vector-raster.questions.json";
import cartography from "./05-cartography.questions.json";
import formatsTiles from "./06-formats-tiles.questions.json";
import gisTools from "./07-gis-tools.questions.json";
import dataQuality from "./08-data-quality.questions.json";
import spatialAnalysis from "./09-spatial-analysis.questions.json";
import terrain from "./10-terrain.questions.json";
import remoteSensing from "./11-remote-sensing.questions.json";
import spatialDb from "./12-spatial-db.questions.json";
import webgis from "./13-webgis.questions.json";

/**
 * 题库注册表：显式 import 让内容进入 bundle 且被 TS 检查，
 * 校验统一走 lib/content.ts（构建期）+ scripts/validate-content.ts（CI）。
 * 新大纲 14 章：未交付章节（05/07/08/09/10/11）无题库，随批次补充。
 */
const RAW_BY_MODULE: Record<string, unknown> = {
  "00": geoMath,
  "01": basics,
  "02": projection,
  "03": crsEpsg,
  "04": vectorRaster,
  "05": cartography,
  "06": formatsTiles,
  "07": gisTools,
  "08": dataQuality,
  "09": spatialAnalysis,
  "10": terrain,
  "11": remoteSensing,
  "12": spatialDb,
  "13": webgis,
};

export function rawQuestionsFor(moduleSlug: string): unknown {
  const raw = RAW_BY_MODULE[moduleSlug];
  if (!raw) throw new Error(`模块 ${moduleSlug} 没有题库文件`);
  return raw;
}

/** 仅用于「有哪些模块有题库」的枚举 */
export const MODULE_SLUGS_WITH_QUESTIONS = Object.keys(RAW_BY_MODULE);

export type { Question };
