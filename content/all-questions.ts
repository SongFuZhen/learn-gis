import type { Question } from "@/lib/quiz/types";
import { ALL_QUESTIONS as GIS_QUESTIONS } from "./gis/all-questions";
import { ALL_QUESTIONS as CESIUM_QUESTIONS } from "./cesium/all-questions";
import { ALL_QUESTIONS as TURF_QUESTIONS } from "./turf/all-questions";
import { ALL_QUESTIONS as THREE_QUESTIONS } from "./three/all-questions";

/** 全站合并题库：考试（每日/综合）与复习队列跨技能共用 */
export const ALL_QUESTIONS: Question[] = [
  ...GIS_QUESTIONS,
  ...CESIUM_QUESTIONS,
  ...TURF_QUESTIONS,
  ...THREE_QUESTIONS,
];
