/**
 * 题目生成共享工具：确定性 RNG + 题目构造器。
 * 生成脚本只在仓库内跑一次并提交产物 JSON；种子固定，重跑幂等。
 */

export type Diff = 1 | 2 | 3;
export type Ref = { title: string; url: string };

/** mulberry32：小巧、可复现的 PRNG */
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

export function rngFor(module: string): () => number {
  return mulberry32(20261001 + Number(module) * 7919);
}

export const rint = (r: () => number, min: number, max: number): number =>
  min + Math.floor(r() * (max - min + 1));

export const pick = <T,>(r: () => number, arr: readonly T[]): T =>
  arr[Math.floor(r() * arr.length)] as T;

/** 从数组不重复地取 n 个（不足则回填重复） */
export function sample<T,>(r: () => number, arr: readonly T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n; i += 1) {
    if (pool.length === 0) pool.push(...arr);
    out.push(pool.splice(Math.floor(r() * pool.length), 1)[0] as T);
  }
  return out;
}

export const round = (v: number, d = 2): number => Number(v.toFixed(d));

const base = (
  module: string,
  difficulty: number,
  stem: string,
  explanation: string,
  refs: Ref[],
) => ({ skill: "gis", module, difficulty: difficulty as Diff, stem, explanation, refs });

/** 数值计算题 */
export function numeric(
  module: string,
  difficulty: number,
  stem: string,
  answer: number,
  tolerance: number,
  explanation: string,
  refs: Ref[],
  opts?: { unit?: string; placeholder?: string },
) {
  return {
    ...base(module, difficulty, stem, explanation, refs),
    type: "numeric",
    answer,
    tolerance,
    ...(opts?.unit ? { unit: opts.unit } : {}),
    ...(opts?.placeholder ? { placeholder: opts.placeholder } : {}),
  };
}

/** 判断题 */
export function truefalse(
  module: string,
  difficulty: number,
  stem: string,
  answer: boolean,
  explanation: string,
  refs: Ref[],
) {
  return {
    ...base(module, difficulty, stem, explanation, refs),
    type: "truefalse",
    answer,
  };
}

/** 短答题 */
export function short(
  module: string,
  difficulty: number,
  stem: string,
  accepted: string[],
  explanation: string,
  refs: Ref[],
  placeholder?: string,
) {
  return {
    ...base(module, difficulty, stem, explanation, refs),
    type: "short",
    accepted,
    ...(placeholder ? { placeholder } : {}),
  };
}

export type Opt = { key: string; text: string; hint?: string };

/** 单选题 */
export function single(
  module: string,
  difficulty: number,
  stem: string,
  options: Opt[],
  answer: string,
  explanation: string,
  refs: Ref[],
) {
  return {
    ...base(module, difficulty, stem, explanation, refs),
    type: "single",
    options,
    answer: [answer],
  };
}

/** 多选题 */
export function multi(
  module: string,
  difficulty: number,
  stem: string,
  options: Opt[],
  answer: string[],
  explanation: string,
  refs: Ref[],
) {
  return {
    ...base(module, difficulty, stem, explanation, refs),
    type: "multi",
    options,
    answer,
  };
}

/** 地图题 */
export function map(
  module: string,
  difficulty: number,
  stem: string,
  lat: number,
  lng: number,
  toleranceKm: number,
  explanation: string,
  refs: Ref[],
) {
  return {
    ...base(module, difficulty, stem, explanation, refs),
    type: "map",
    target: { lat, lng },
    toleranceKm,
  };
}

/** 判断题批量元组：[题干, 答案, 解析]，难度按序循环 1/2/3 */
export type TfTuple = [string, boolean, string];

export function tfBatch(
  module: string,
  tuples: TfTuple[],
  refs: Ref[],
): ReturnType<typeof truefalse>[] {
  return tuples.map(([stem, answer, explanation], i) =>
    truefalse(module, (i % 3) + 1, stem, answer, explanation, refs),
  );
}
