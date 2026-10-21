import type { Grade, Question, QuizResponse } from "./types";

/**
 * 短答规范化：去首尾空白、全角转半角、统一小写、压缩内部空格，
 * 这样 "Degree"、"ｄｅｇｒｅｅ"、" degree " 都能命中 "degree"。
 */
export function normalizeShortAnswer(input: string): string {
  return input
    .replace(/[\uFF01-\uFF5E]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
    )
    .replace(/\u3000/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  if (setA.size !== new Set(b).size) return false;
  return b.every((item) => setA.has(item));
}

/** 纯函数判卷：无部分分，选择题按集合相等 */
export function grade(question: Question, response: QuizResponse): Grade {
  if (question.type === "short") {
    if (response.kind !== "short") {
      return { correct: false, expected: question.accepted.slice(0, 1) };
    }
    const value = normalizeShortAnswer(response.text);
    const correct =
      value.length > 0 &&
      question.accepted.some((a) => normalizeShortAnswer(a) === value);
    return { correct, expected: question.accepted.slice(0, 1) };
  }

  if (response.kind !== "choice") {
    return { correct: false, expected: [...question.answer] };
  }
  return {
    correct: sameSet(response.selected, question.answer),
    expected: [...question.answer],
  };
}

/** 干扰项级反馈：找出用户选中、但不在答案里的选项 */
export function wrongPicks(question: Question, response: QuizResponse) {
  if (question.type === "short" || response.kind !== "choice") return [];
  return question.options.filter(
    (option) =>
      response.selected.includes(option.key) && !question.answer.includes(option.key),
  );
}

/** 漏选的正确项（多选场景） */
export function missedPicks(question: Question, response: QuizResponse) {
  if (question.type === "short" || response.kind !== "choice") return [];
  return question.options.filter(
    (option) =>
      question.answer.includes(option.key) && !response.selected.includes(option.key),
  );
}
