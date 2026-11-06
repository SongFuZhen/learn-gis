import type { Question } from "@/lib/quiz/types";
import { questionSchema } from "@/content/schema";
import cesiumIntro from "./00-cesium-intro.questions.json";
import cameraCoords from "./01-camera-coords.questions.json";
import imageryLayers from "./02-imagery-layers.questions.json";
import terrain from "./03-terrain.questions.json";

/**
 * Cesium 全量题库（客户端聚合，只 import JSON，不碰 lib/content）。
 * 每道题跑 questionSchema 校验，坏数据在模块加载时抛错。
 */
const RAW_FILES = [cesiumIntro, cameraCoords, imageryLayers, terrain];

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
