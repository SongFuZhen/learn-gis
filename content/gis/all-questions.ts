import type { Question } from "@/lib/quiz/types";
import geoMath from "./00-geo-math.questions.json";
import basics from "./01-basics.questions.json";
import crsEpsg from "./02-crs-epsg.questions.json";
import vectorRaster from "./03-vector-raster.questions.json";
import formatsTiles from "./04-formats-tiles.questions.json";
import ogcWebmap from "./05-ogc-webmap.questions.json";
import spatialPostgis from "./06-spatial-postgis.questions.json";

/**
 * 全量题库（按章节顺序）。
 * 供客户端抽题使用：只 import JSON，不碰 lib/content（那里会拖进 MDX 与 fs）。
 * 校验仍由 lib/content.ts 与 scripts/validate-content.ts 负责。
 */
export const ALL_QUESTIONS: Question[] = [
  ...geoMath.questions,
  ...basics.questions,
  ...crsEpsg.questions,
  ...vectorRaster.questions,
  ...formatsTiles.questions,
  ...ogcWebmap.questions,
  ...spatialPostgis.questions,
] as unknown as Question[];
