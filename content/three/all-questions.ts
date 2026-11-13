import type { Question } from "@/lib/quiz/types";
import { questionSchema } from "@/content/schema";
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
 * three.js 全量题库（客户端聚合，只 import JSON，不碰 lib/content）。
 * 每道题跑 questionSchema 校验，坏数据在模块加载时抛错。
 */
const RAW_FILES = [
  threeIntro,
  sceneCamera,
  geometryMaterial,
  lightShadow,
  textureLoader,
  orbitRaycast,
  animation,
  shaderBasics,
  postprocessing,
  geoIntegration,
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
