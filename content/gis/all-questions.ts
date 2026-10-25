import type { Question } from "@/lib/quiz/types";
import { questionSchema } from "@/content/schema";
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

/**
 * 全量题库（按章节顺序）。
 * 供客户端抽题使用：只 import JSON，不碰 lib/content（那里会拖进 MDX 与 fs）。
 * 这里仍然对每道题跑 questionSchema 校验，避免绕过 lib/content.ts 的构建期校验，
 * 让坏数据在模块加载（next build / 首屏渲染）时就抛错而非运行时才炸。
 */
const RAW_FILES = [geoMath, mathNotation, basics, projection, crsEpsg, vectorRaster, cartography, formatsTiles, gisTools, dataQuality, spatialAnalysis, terrain, remoteSensing, spatialDb, webgis];

function collectValidated(): Question[] {
  const out: Question[] = [];
  RAW_FILES.forEach((file, fileIdx) => {
    const mod = (file as { module?: string }).module;
    const questions = (file as { questions: unknown[] }).questions;
    questions.forEach((raw, i) => {
      const parsed = questionSchema.safeParse(raw);
      if (!parsed.success) {
        const where = mod !== undefined ? mod : "file#" + fileIdx;
        const issues = parsed.error.issues
          .map((iss) => iss.path.join(".") + ": " + iss.message)
          .join("; ");
        throw new Error("题库校验失败 " + where + " [第" + i + "题]: " + issues);
      }
      out.push(parsed.data as Question);
    });
  });
  return out;
}

export const ALL_QUESTIONS: Question[] = collectValidated();
