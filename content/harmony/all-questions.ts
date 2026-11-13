import type { Question } from "@/lib/quiz/types";
import { questionSchema } from "@/content/schema";
import cognitiveMap from "./00-cognitive-map.questions.json";
import envProject from "./01-env-project.questions.json";
import arkuiDeclarative from "./02-arkui-declarative.questions.json";
import stateManagement from "./03-state-management.questions.json";
import navigation from "./04-navigation.questions.json";
import networkAsync from "./05-network-async.questions.json";
import persistenceLifecycle from "./06-persistence-lifecycle.questions.json";
import polishPractice from "./07-polish-practice.questions.json";

/**
 * HarmonyOS 全量题库（客户端聚合，只 import JSON，不碰 lib/content）。
 * 每道题跑 questionSchema 校验，坏数据在模块加载时抛错。
 */
const RAW_FILES = [
  cognitiveMap,
  envProject,
  arkuiDeclarative,
  stateManagement,
  navigation,
  networkAsync,
  persistenceLifecycle,
  polishPractice,
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
