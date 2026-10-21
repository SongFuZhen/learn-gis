import { grade } from "./grade";
import type { AnswerRecord, Question, QuizResponse } from "./types";

export type SessionPhase = "answering" | "revealed" | "finished";

export type SessionState = {
  questions: Question[];
  index: number;
  phase: SessionPhase;
  records: AnswerRecord[];
};

export type SessionAction =
  | { type: "submit"; response: QuizResponse }
  | { type: "next" }
  | { type: "restart" };

export function createSession(questions: Question[]): SessionState {
  if (questions.length === 0) {
    throw new Error("createSession 需要至少一道题");
  }
  return { questions, index: 0, phase: "answering", records: [] };
}

/** 当前题目（已保证 index 合法） */
export function currentQuestion(state: SessionState): Question {
  const question = state.questions[state.index];
  if (!question) throw new Error(`题目下标越界：${state.index}`);
  return question;
}

/** 当前题目的作答记录（未作答为 null） */
export function currentRecord(state: SessionState): AnswerRecord | null {
  const question = currentQuestion(state);
  return state.records.find((r) => r.questionId === question.id) ?? null;
}

/**
 * 状态机：answering → (submit) → revealed → (next) → answering | finished
 * 重复 submit / 未揭晓就 next 都被忽略，保证 UI 竞态安全。
 */
export function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.type) {
    case "submit": {
      if (state.phase !== "answering") return state;
      const question = currentQuestion(state);
      const result = grade(question, action.response);
      return {
        ...state,
        phase: "revealed",
        records: [
          ...state.records,
          {
            questionId: question.id,
            response: action.response,
            correct: result.correct,
          },
        ],
      };
    }
    case "next": {
      if (state.phase !== "revealed") return state;
      const nextIndex = state.index + 1;
      if (nextIndex >= state.questions.length) {
        return { ...state, phase: "finished" };
      }
      return { ...state, index: nextIndex, phase: "answering" };
    }
    case "restart":
      return { ...state, index: 0, phase: "answering", records: [] };
    default:
      return state;
  }
}

export type SessionResult = {
  total: number;
  answered: number;
  correct: number;
  accuracy: number;
  wrongIds: string[];
  /** 0~100 的掌握度：与正确率同义，单独命名便于 UI 文案 */
  mastery: number;
};

export function summarize(state: SessionState): SessionResult {
  const total = state.questions.length;
  const answered = state.records.length;
  const correct = state.records.filter((r) => r.correct).length;
  const accuracy = answered === 0 ? 0 : correct / answered;
  return {
    total,
    answered,
    correct,
    accuracy,
    wrongIds: state.records.filter((r) => !r.correct).map((r) => r.questionId),
    mastery: Math.round(accuracy * 100),
  };
}
