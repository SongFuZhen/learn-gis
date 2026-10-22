/** 引擎层纯类型：不 import React，可在 Node / Edge / 单测中直接使用 */

export type Ref = {
  title: string;
  url: string;
};

export type Option = {
  key: string;
  text: string;
  hint?: string;
};

type BaseQuestion = {
  id: string;
  skill: string;
  module: string;
  difficulty: 1 | 2 | 3;
  stem: string;
  explanation: string;
  refs: Ref[];
};

export type ChoiceQuestion = BaseQuestion & {
  type: "single" | "multi";
  options: Option[];
  answer: string[];
};

export type ShortQuestion = BaseQuestion & {
  type: "short";
  accepted: string[];
  placeholder?: string;
};

/** 地图题：在地图上点击一个位置，按与目标点的球面距离判分 */
export type MapQuestion = BaseQuestion & {
  type: "map";
  target: { lat: number; lng: number };
  /** 通过阈值（公里）：点击点到目标点的球面距离 <= 该值算对 */
  toleranceKm: number;
};

export type Question = ChoiceQuestion | ShortQuestion | MapQuestion;

export function isChoice(question: Question): question is ChoiceQuestion {
  return question.type === "single" || question.type === "multi";
}

/** 用户作答：选择题提交 key 集合，短答题提交文本，地图题提交经纬度 */
export type QuizResponse =
  | { kind: "choice"; selected: string[] }
  | { kind: "short"; text: string }
  | { kind: "map"; lat: number; lng: number };

export type Grade = {
  correct: boolean;
  /** 判卷后要展示的正确答案（选择题为 key 集合，短答题为首个可接受答案） */
  expected: string[];
};

export type AnswerRecord = {
  questionId: string;
  response: QuizResponse;
  correct: boolean;
};
