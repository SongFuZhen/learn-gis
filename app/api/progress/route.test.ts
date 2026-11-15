import { beforeEach, describe, expect, it, vi } from "vitest";

const FIXED_UUID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

vi.mock("@/lib/api/user", () => ({
  getOrCreateUserId: vi.fn(async () => FIXED_UUID),
}));

const { ensureCheckin } = vi.hoisted(() => ({
  ensureCheckin: vi.fn(async () => ({ isNewToday: true })),
}));
vi.mock("@/lib/engagement/checkin", () => ({ ensureCheckin }));

const { dbMock } = vi.hoisted(() => {
  function chainNode(): Record<string, unknown> {
    const node: Record<string, unknown> = {};
    for (const key of [
      "select",
      "from",
      "where",
      "and",
      "limit",
      "orderBy",
      "insert",
      "values",
      "update",
      "set",
      "onConflictDoUpdate",
      "onConflictDoNothing",
      "returning",
    ]) {
      node[key] = vi.fn(() => node);
    }
    // 链式 select 的终态默认解析为空数组（模拟章节进度行不存在 → 走 insert 分支）
    node.then = (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve([]).then(onFulfilled);
    return node;
  }
  const db = new Proxy(
    {},
    {
      get() {
        return vi.fn(() => chainNode());
      },
    },
  );
  return { dbMock: { db } };
});

vi.mock("@/db", () => ({ db: dbMock.db }));

import { POST } from "./route";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  ensureCheckin.mockResolvedValue({ isNewToday: true });
});

describe("POST /api/progress 自动签到", () => {
  it("校验通过的学习写入触发一次 ensureCheckin，参数为当前用户", async () => {
    const res = await POST(
      jsonRequest({
        type: "module-quiz-complete",
        skill: "gis",
        moduleSlug: "00-geo-math",
        correct: 8,
        total: 10,
      }),
    );
    expect(res.status).toBe(200);
    expect(ensureCheckin).toHaveBeenCalledTimes(1);
    expect(ensureCheckin).toHaveBeenCalledWith(FIXED_UUID);
  });

  it("请求体不合法时直接 400，不触发签到", async () => {
    const res = await POST(jsonRequest({ type: "submit-answer" }));
    expect(res.status).toBe(400);
    expect(ensureCheckin).not.toHaveBeenCalled();
  });
});
