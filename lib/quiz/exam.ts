import type { Question } from "./types";

/**
 * 考试的抽题逻辑：纯函数 + 可注入随机源，方便测试与「每日一考」的确定性复现。
 * 「每日一考」用日期做种子——同一天所有人拿到同一套卷，第二天自动换卷；
 * 「综合考试」用真随机种子，每次进来都是新卷。
 */

export type ExamMode = "daily" | "mock";

export const EXAM_PLAN: Record<
  ExamMode,
  { label: string; size: number; blurb: string }
> = {
  daily: {
    label: "每日一考",
    size: 10,
    blurb: "每天一套，跨章节随机抽 10 题，同一天进来都是同一份卷。",
  },
  mock: {
    label: "综合考试",
    size: 25,
    blurb: "跨全部章节随机抽 25 题，每次开考都是新卷。",
  },
};

/** FNV-1a 32 位哈希：把日期之类的短字符串变成种子 */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32：小巧、够快、可复现的 PRNG */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 本地日期键 `YYYY-MM-DD`（用本地时区，用户所在时区的「今天」才是今天） */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 真随机种子（综合考试用）：放在 lib 里，避免在组件渲染期间直接调用 Math.random */
export function randomSeed(): number {
  return (Math.random() * 4294967296) >>> 0;
}

export function dailySeed(key: string): number {
  return fnv1a(`learn-gis:daily:${key}`);
}

function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const current = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = current;
  }
  return copy;
}

/**
 * 抽题：按章节轮转取题，保证一套卷尽量覆盖更多章节；
 * 章节数少于题量时，第二轮再回到各章补题。结果不含重复题。
 */
export function pickExamQuestions(
  source: readonly Question[],
  count: number,
  rand: () => number,
): Question[] {
  if (count <= 0) return [];

  const seen = new Set<string>();
  const unique = source.filter((q) => {
    if (seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });
  if (unique.length <= count) return shuffled(unique, rand);

  const byModule = new Map<string, Question[]>();
  for (const question of unique) {
    const bucket = byModule.get(question.module);
    if (bucket) bucket.push(question);
    else byModule.set(question.module, [question]);
  }

  const buckets = shuffled(
    [...byModule.values()].map((bucket) => shuffled(bucket, rand)),
    rand,
  );

  const picked: Question[] = [];
  for (let round = 0; picked.length < count; round += 1) {
    const before = picked.length;
    for (const bucket of buckets) {
      const question = bucket[round];
      if (question) picked.push(question);
      if (picked.length === count) break;
    }
    // 所有章节都抽空，仍不够（题库总量小于 count）——返回已有的
    if (picked.length === before) break;
  }

  return picked;
}
