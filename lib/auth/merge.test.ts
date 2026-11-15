import { describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { mergeAnonymousInto } from "./merge";
import {
  annotations,
  checkIns,
  examSessions,
  moduleProgress,
  users,
  wrongAnswers,
} from "@/db/schema";

type Op = { table: string; op: "update" | "delete"; set?: unknown };

/** 按 select 调用顺序出数的假 tx，同时记录所有写操作 */
function makeTx(selectResults: unknown[][]) {
  const ops: Op[] = [];
  let selectIdx = 0;
  type Table = Parameters<typeof getTableName>[0];
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    set: vi.fn(() => chain),
    then(onFulfilled: (v: unknown) => unknown) {
      const rows = selectResults[selectIdx] ?? [];
      selectIdx += 1;
      return Promise.resolve(rows).then(onFulfilled);
    },
  };
  const tx = {
    select: vi.fn(() => chain),
    update: vi.fn((table: Table) => {
      const node = {
        set: (payload: unknown) => {
          ops.push({ table: tableName(table), op: "update", set: payload });
          return node;
        },
        where: () => node,
      };
      return node;
    }),
    delete: vi.fn((table: Table) => {
      const node = {
        where: () => {
          ops.push({ table: tableName(table), op: "delete" });
          return node;
        },
      };
      return node;
    }),
  };
  return { tx, ops };
}

function tableName(table: Parameters<typeof getTableName>[0]): string {
  return getTableName(table);
}

const ANON = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const ACCOUNT = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

describe("mergeAnonymousInto", () => {
  it("同 id 直接跳过", async () => {
    const { tx, ops } = makeTx([]);
    await mergeAnonymousInto(tx as never, ANON, ANON);
    expect(ops).toHaveLength(0);
  });

  it("冲突错题先删后并入，章节进度加权合并，最后删匿名用户", async () => {
    const selectResults = [
      // 1) 匿名错题：q1 与账号冲突，q2 独有
      [
        { id: "w1", questionId: "q1" },
        { id: "w2", questionId: "q2" },
      ],
      // 2) 账号已有错题
      [{ questionId: "q1" }],
      // 3) 匿名章节进度：m1 账号已有，m2 没有
      [
        {
          id: "p1",
          skill: "gis",
          moduleSlug: "01",
          mastery: 100,
          quizCount: 2,
          totalAttempts: 10,
          wrongCount: 3,
          skippedCount: 1,
          lastAttemptAt: new Date("2026-01-02"),
        },
        {
          id: "p2",
          skill: "gis",
          moduleSlug: "02",
          mastery: 50,
          quizCount: 1,
          totalAttempts: 5,
          wrongCount: 1,
          skippedCount: 0,
          lastAttemptAt: null,
        },
      ],
      // 4) m1 账号已有行
      [
        {
          id: "pa",
          skill: "gis",
          moduleSlug: "01",
          mastery: 80,
          quizCount: 6,
          totalAttempts: 20,
          wrongCount: 5,
          skippedCount: 2,
          lastAttemptAt: new Date("2026-01-01"),
        },
      ],
      // 5) m2 账号无行（limit 1 空结果）
      [],
    ];
    const { tx, ops } = makeTx(selectResults);

    await mergeAnonymousInto(tx as never, ANON, ACCOUNT);

    // 冲突错题 w1 删除
    expect(ops.some((o) => o.table === tableName(wrongAnswers) && o.op === "delete")).toBe(true);
    // 其余错题改归属
    const wrongUpdate = ops.find((o) => o.table === tableName(wrongAnswers) && o.op === "update");
    expect(wrongUpdate?.set).toMatchObject({ userId: ACCOUNT });

    // m1 加权：(80*6 + 100*2)/8 = 85；计数求和
    const progressMerge = ops
      .filter((o) => o.table === tableName(moduleProgress) && o.op === "update")
      .map((o) => o.set);
    expect(progressMerge).toContainEqual(
      expect.objectContaining({
        mastery: 85,
        quizCount: 8,
        totalAttempts: 30,
        wrongCount: 8,
        skippedCount: 3,
      }),
    );
    // m2 无账号行 → 直接改归属
    expect(progressMerge).toContainEqual({ userId: ACCOUNT });

    // 考试与标注整体改归属
    expect(
      ops.some((o) => o.table === tableName(examSessions) && o.op === "update"),
    ).toBe(true);
    expect(
      ops.some((o) => o.table === tableName(annotations) && o.op === "update"),
    ).toBe(true);

    // 匿名用户行删除
    expect(ops.at(-1)).toEqual({ table: tableName(users), op: "delete" });
  });

  it("考试与签到同 dateKey 冲突先删匿名行，独有行改归属", async () => {
    const selectResults = [
      [], // 匿名错题：无
      [], // 匿名章节进度：无（逐行循环不再发 select）
      // 匿名考试：d1 与账号冲突，d2 独有，综合卷 dateKey=null 不受唯一约束
      [
        { id: "e1", dateKey: "2026-11-14" },
        { id: "e2", dateKey: "2026-11-13" },
        { id: "e3", dateKey: null },
      ],
      [{ dateKey: "2026-11-14" }], // 账号已有同日每日卷
      // 匿名签到：d1 冲突，d2 独有
      [
        { id: "c1", dateKey: "2026-11-14" },
        { id: "c2", dateKey: "2026-11-13" },
      ],
      [{ dateKey: "2026-11-14" }], // 账号已有同日签到
    ];
    const { tx, ops } = makeTx(selectResults);

    await mergeAnonymousInto(tx as never, ANON, ACCOUNT);

    expect(
      ops.some((o) => o.table === tableName(examSessions) && o.op === "delete"),
    ).toBe(true);
    expect(
      ops.some((o) => o.table === tableName(examSessions) && o.op === "update"),
    ).toBe(true);
    expect(
      ops.some((o) => o.table === tableName(checkIns) && o.op === "delete"),
    ).toBe(true);
    const checkinUpdate = ops.find(
      (o) => o.table === tableName(checkIns) && o.op === "update",
    );
    expect(checkinUpdate?.set).toEqual({ userId: ACCOUNT });
    expect(ops.at(-1)).toEqual({ table: tableName(users), op: "delete" });
  });
});
