import type { Question } from "@/lib/quiz/types";
import { questionSchema } from "@/content/schema";
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
 * Turf 全量题库（客户端聚合，只 import JSON，不碰 lib/content）。
 * 每道题跑 questionSchema 校验，坏数据在模块加载时抛错。
 */
const RAW_FILES = [
  turfIntro,
  measurement,
  bearingDestination,
  bufferTransform,
  booleanJoins,
  pointPolygonVoronoi,
  aggregation,
  interpolationRandom,
  leafletMaplibre,
  performanceData,
];

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
        throw new Error(
          "题库校验失败 " + where + " [第" + i + "题]: " + issues,
        );
      }
      out.push(parsed.data as Question);
    });
  });
  return out;
}

export const ALL_QUESTIONS: Question[] = collectValidated();
