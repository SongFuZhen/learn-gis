import type { Grade, NumericQuestion, Question, QuizResponse } from "./types";
import { isChoice } from "./types";

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
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatLatLng(p: { lat: number; lng: number }): string {
  const ns = p.lat >= 0 ? "N" : "S";
  const ew = p.lng >= 0 ? "E" : "W";
  return Math.abs(p.lat).toFixed(2) + "°" + ns + ", " + Math.abs(p.lng).toFixed(2) + "°" + ew;
}

/** 各题型的参考答案（展示用）：跳过/未作答时也能取到 */
export function expectedAnswer(question: Question): string[] {
  if (question.type === "map") return [formatLatLng(question.target)];
  if (question.type === "short") return question.accepted.slice(0, 1);
  if (question.type === "numeric") return [formatNumeric(question)];
  if (question.type === "truefalse") return [question.answer ? "对" : "错"];
  if (isChoice(question)) return [...question.answer];
  return [];
}

export function grade(question: Question, response: QuizResponse): Grade {
  const expected = expectedAnswer(question);

  if (question.type === "map") {
    if (response.kind !== "map") {
      return { correct: false, expected };
    }
    const dist = haversineKm(
      response.lat,
      response.lng,
      question.target.lat,
      question.target.lng,
    );
    return {
      correct: dist <= question.toleranceKm,
      expected,
    };
  }

  if (question.type === "short") {
    if (response.kind !== "short") {
      return { correct: false, expected };
    }
    const value = normalizeShortAnswer(response.text);
    const correct =
      value.length > 0 &&
      question.accepted.some((a) => normalizeShortAnswer(a) === value);
    return { correct, expected };
  }

  if (question.type === "numeric") {
    if (response.kind !== "numeric") {
      return { correct: false, expected };
    }
    const correct = Math.abs(response.value - question.answer) <= question.tolerance;
    return { correct, expected };
  }

  if (question.type === "truefalse") {
    if (response.kind !== "boolean") {
      return { correct: false, expected };
    }
    return {
      correct: response.value === question.answer,
      expected,
    };
  }

  if (isChoice(question)) {
    if (response.kind !== "choice") {
      return { correct: false, expected };
    }
    return {
      correct: sameSet(response.selected, question.answer),
      expected,
    };
  }
  return { correct: false, expected: [] };
}

/** 数值题的期望答案展示：带上单位，保留合理精度 */
function formatNumeric(question: NumericQuestion): string {
  const value = Number.isInteger(question.answer)
    ? String(question.answer)
    : String(Number(question.answer.toPrecision(6)));
  return question.unit ? value + " " + question.unit : value;
}

/** 干扰项级反馈：找出用户选中、但不在答案里的选项 */
export function wrongPicks(question: Question, response: QuizResponse) {
  if (!isChoice(question) || response.kind !== "choice") return [];
  return question.options.filter(
    (option) =>
      response.selected.includes(option.key) && !question.answer.includes(option.key),
  );
}

/** 漏选的正确项（多选场景） */
export function missedPicks(question: Question, response: QuizResponse) {
  if (!isChoice(question) || response.kind !== "choice") return [];
  return question.options.filter(
    (option) =>
      question.answer.includes(option.key) && !response.selected.includes(option.key),
  );
}
