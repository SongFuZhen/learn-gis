import cognitiveMap from "./00-cognitive-map.questions.json";
import envProject from "./01-env-project.questions.json";
import arkuiDeclarative from "./02-arkui-declarative.questions.json";
import stateManagement from "./03-state-management.questions.json";
import navigation from "./04-navigation.questions.json";
import networkAsync from "./05-network-async.questions.json";
import persistenceLifecycle from "./06-persistence-lifecycle.questions.json";
import polishPractice from "./07-polish-practice.questions.json";

/**
 * 题库注册表：显式 import 让内容进入 bundle 且被 TS 检查，
 * 校验统一走 lib/content.ts（构建期）+ scripts/validate-content.ts（CI）。
 */
const RAW_BY_MODULE: Record<string, unknown> = {
  "00": cognitiveMap,
  "01": envProject,
  "02": arkuiDeclarative,
  "03": stateManagement,
  "04": navigation,
  "05": networkAsync,
  "06": persistenceLifecycle,
  "07": polishPractice,
};

export function rawQuestionsFor(moduleSlug: string): unknown {
  const raw = RAW_BY_MODULE[moduleSlug];
  if (!raw) throw new Error(`模块 ${moduleSlug} 没有题库文件`);
  return raw;
}

/** 仅用于「有哪些模块有题库」的枚举 */
export const MODULE_SLUGS_WITH_QUESTIONS = Object.keys(RAW_BY_MODULE);
