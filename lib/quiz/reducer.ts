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
  | { type: "skip" }
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
            skipped: false,
          },
        ],
      };
    }
    case "skip": {
      // 跳过 = 承认不会：不判卷、无 response，按答错计入但单列 skipped
      if (state.phase !== "answering") return state;
      const question = currentQuestion(state);
      return {
        ...state,
        phase: "revealed",
        records: [
          ...state.records,
          {
            questionId: question.id,
            response: null,
            correct: false,
            skipped: true,
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
  /** 主动跳过题数：包含在 answered/wrongIds 内，但不进正确率分母 */
  skipped: number;
  /** 跳过题 id（结果页错题列表打标签用） */
  skippedIds: string[];
  accuracy: number;
  wrongIds: string[];
  /** 0~100 的掌握度：与正确率同义，单独命名便于 UI 文案 */
  mastery: number;
};

export function summarize(state: SessionState): SessionResult {
  const total = state.questions.length;
  const answered = state.records.length;
  const correct = state.records.filter((r) => r.correct).length;
  const skipped = state.records.filter((r) => r.skipped).length;
  // 正确率只按实际作答题计算；跳过题不污染分母（全跳过则为 0）
  const graded = answered - skipped;
  const accuracy = graded === 0 ? 0 : correct / graded;
  return {
    total,
    answered,
    correct,
    skipped,
    skippedIds: state.records.filter((r) => r.skipped).map((r) => r.questionId),
    accuracy,
    // 跳过按答错处理：进错题列表与复习队列
    wrongIds: state.records.filter((r) => !r.correct).map((r) => r.questionId),
    mastery: Math.round(accuracy * 100),
  };
}
