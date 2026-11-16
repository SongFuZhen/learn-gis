import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, setSelectQueue } = vi.hoisted(() => {
  // getLeaderboard 内 Promise.all 的四条 select 按入组顺序排队返回
  let queue: unknown[] = [];
  function chainNode(): Record<string, unknown> {
    const node: Record<string, unknown> = {};
    for (const key of [
      "select",
      "from",
      "where",
      "groupBy",
      "orderBy",
    ]) {
      node[key] = vi.fn(() => node);
    }
    node.then = (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve(queue.shift() ?? []).then(onFulfilled);
    return node;
  }
  const dbMock = {
    select: vi.fn(() => chainNode()),
  };
  return {
    dbMock,
    setSelectQueue: (rows: unknown[]) => {
      queue = [...rows];
    },
  };
});

vi.mock("@/db", () => ({ db: dbMock }));

import { getLeaderboard } from "@/lib/engagement/leaderboard";
import { dateKey } from "@/lib/quiz/exam";

function dayAgo(delta: number): string {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return dateKey(d);
}

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getLeaderboard", () => {
  it("按积分公式合并四类数据并降序排名，标注当前用户", async () => {
    setSelectQueue([
      // 账号（仅注册用户）；公开名只取昵称，不回退登录名
      [
        { id: ALICE, username: "alice", nickname: "爱丽丝" },
        { id: BOB, username: "bob", nickname: null },
      ],
      // 答题聚合：alice 10 题，bob 20 题
      [
        { userId: ALICE, answered: 10 },
        { userId: BOB, answered: 20 },
      ],
      // 考试聚合：alice 两场 masterySum=160 → 80 考试分
      [{ userId: ALICE, examCount: 2, masterySum: 160 }],
      // 签到明细：alice 连签今天+昨天两天
      [
        { userId: ALICE, dateKey: dayAgo(0) },
        { userId: ALICE, dateKey: dayAgo(-1) },
      ],
    ]);

    const board = await getLeaderboard(BOB);

    // alice: 答题10 + 考试 round(160*0.5)=80 + 签到 2*5=10 + streak 2*3=6 = 106
    // bob: 答题20，无考试无签到 = 20
    expect(board).toHaveLength(2);
    expect(board[0]).toMatchObject({
      rank: 1,
      userId: ALICE,
      displayName: "爱丽丝",
      points: 106,
      answered: 10,
      examCount: 2,
      checkinDays: 2,
      streak: 2,
      isCurrentUser: false,
    });
    expect(board[1]).toMatchObject({
      rank: 2,
      userId: BOB,
      displayName: "学员_2222",
      points: 20,
      isCurrentUser: true,
    });
  });

  it("同分时按答题数破平，再按昵称字典序", async () => {
    setSelectQueue([
      [
        { id: ALICE, username: "alice", nickname: "佐伊" },
        { id: BOB, username: "bob", nickname: "艾米" },
      ],
      [
        { userId: ALICE, answered: 30 },
        { userId: BOB, answered: 20 },
      ],
      [],
      [],
    ]);

    const board = await getLeaderboard();
    // 同分 30 vs 20 → 答题多的佐伊在前；若答题也相同则昵称字典序
    expect(board.map((e) => e.displayName)).toEqual(["佐伊", "艾米"]);
    expect(board.map((e) => e.rank)).toEqual([1, 2]);
  });

  it("DB 异常时回落空数组，不抛错", async () => {
    dbMock.select.mockImplementation(() => {
      throw new Error("connection terminated");
    });
    await expect(getLeaderboard()).resolves.toEqual([]);
  });
});
