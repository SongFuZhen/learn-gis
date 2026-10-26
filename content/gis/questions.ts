import type { Question } from "@/lib/quiz/types";
import geoMath from "./00-geo-math.questions.json";
import mathNotation from "./01-math-notation.questions.json";
import basics from "./02-basics.questions.json";
import projection from "./03-projection.questions.json";
import crsEpsg from "./04-crs-epsg.questions.json";
import vectorRaster from "./05-vector-raster.questions.json";
import cartography from "./06-cartography.questions.json";
import formatsTiles from "./07-formats-tiles.questions.json";
import gisTools from "./08-gis-tools.questions.json";
import dataQuality from "./09-data-quality.questions.json";
import spatialAnalysis from "./10-spatial-analysis.questions.json";
import terrain from "./11-terrain.questions.json";
import remoteSensing from "./12-remote-sensing.questions.json";
import spatialDb from "./13-spatial-db.questions.json";
import webgis from "./14-webgis.questions.json";
import satelliteOrbits from "./15-satellite-orbits.questions.json";
import satelliteConstellations from "./16-satellite-constellations.questions.json";

/**
 * 题库注册表：显式 import 让内容进入 bundle 且被 TS 检查，
 * 校验统一走 lib/content.ts（构建期）+ scripts/validate-content.ts（CI）。
 * 新大纲 15 章：未交付章节（05/07/08/09/10/11）无题库，随批次补充。
 */
const RAW_BY_MODULE: Record<string, unknown> = {
  "00": geoMath,
  "01": mathNotation,
  "02": basics,
  "03": projection,
  "04": crsEpsg,
  "05": vectorRaster,
  "06": cartography,
  "07": formatsTiles,
  "08": gisTools,
  "09": dataQuality,
  "10": spatialAnalysis,
  "11": terrain,
  "12": remoteSensing,
  "13": spatialDb,
  "14": webgis,
  "15": satelliteOrbits,
  "16": satelliteConstellations,
};

export function rawQuestionsFor(moduleSlug: string): unknown {
  const raw = RAW_BY_MODULE[moduleSlug];
  if (!raw) throw new Error(`模块 ${moduleSlug} 没有题库文件`);
  return raw;
}

/** 仅用于「有哪些模块有题库」的枚举 */
export const MODULE_SLUGS_WITH_QUESTIONS = Object.keys(RAW_BY_MODULE);

export type { Question };
