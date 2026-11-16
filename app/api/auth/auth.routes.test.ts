import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-1234567890";

const ANON = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const ACCOUNT = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

/** 内存 cookie jar */
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  })),
}));

/** 限流全放行，单独用例再覆盖实现 */
vi.mock("@/lib/auth/rate-limit", () => ({
  assertAuthAllowed: vi.fn(async () => undefined),
  recordAuthAttempt: vi.fn(async () => undefined),
  RateLimitError: class RateLimitError extends Error {
    constructor(
      message: string,
      public readonly retryAfterSec: number,
    ) {
      super(message);
    }
  },
}));

const { dbMock, lastUpdate, lastValues } = vi.hoisted(() => {
  const state: { update: unknown; values: unknown } = {
    update: null,
    values: null,
  };
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    values: vi.fn((payload: unknown) => {
      state.values = payload;
      return chain;
    }),
    set: vi.fn((payload: unknown) => {
      state.update = payload;
      return chain;
    }),
  };
  const dbMock = {
    select: vi.fn(),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
  };
  return {
    dbMock,
    lastUpdate: () => state.update as Record<string, unknown> | null,
    lastValues: () => state.values as Record<string, unknown> | null,
  };
});
vi.mock("@/db", () => ({ db: dbMock }));
vi.mock("@/lib/db-retry", () => ({
  withRetry: vi.fn(async <T>(fn: () => Promise<T>) => fn()),
}));

import { POST as register } from "./register/route";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { GET as me } from "./me/route";
import { hashPassword } from "@/lib/auth";

function postJson(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** 默认 select 链：终结值由 setSelectRows 控制 */
function useDefaultSelect() {
  vi.mocked(dbMock.select).mockImplementation(() => {
    const node = {
      from: () => node,
      where: () => node,
      limit: () => Promise.resolve(getSelectRows()),
    };
    return node as never;
  });
}
function getSelectRows(): unknown[] {
  return selectRows;
}
let selectRows: unknown[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  jar.clear();
  selectRows = [];
  useDefaultSelect();
});

// scrypt 哈希用例单次约 5s，Windows 高负载下放宽超时
describe("POST /api/auth/register", { timeout: 20_000 }, () => {
  it("无匿名 cookie 也可注册：直接新建账号行并下发会话", async () => {
    const res = await register(
      postJson("http://localhost/api/auth/register", {
        username: "fresh_user",
        password: "password123",
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, username: "fresh_user" });
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
    // 未填昵称：自动生成，绝不把登录名当作公开昵称
    expect(lastValues()?.nickname).toMatch(/^学员_[0-9a-f]{4}$/);
    expect(jar.has("auth_session")).toBe(true);
    expect(jar.has("user_id")).toBe(false);
  });

  it("注册携带昵称时原样落库，允许与登录名不同", async () => {
    const res = await register(
      postJson("http://localhost/api/auth/register", {
        username: "named_user",
        password: "password123",
        nickname: "地图小匠",
      }),
    );
    expect(res.status).toBe(200);
    expect(lastValues()).toMatchObject({
      username: "named_user",
      nickname: "地图小匠",
    });
  });

  it("用户名非法返回 400", async () => {
    jar.set("user_id", ANON);
    const res = await register(
      postJson("http://localhost/api/auth/register", {
        username: "ab",
        password: "password123",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("用户名被占用返回 409", async () => {
    jar.set("user_id", ANON);
    // 两次 select：先查匿名行（存在），再查用户名（已占用）
    const callRows = [
      [{ id: ANON, username: null }],
      [{ id: ACCOUNT }],
    ];
    let i = 0;
    vi.mocked(dbMock.select).mockImplementation(() => {
      const rows = callRows[i] ?? [];
      i += 1;
      const node = {
        from: () => node,
        where: () => node,
        limit: () => Promise.resolve(rows),
      };
      return node as never;
    });

    const res = await register(
      postJson("http://localhost/api/auth/register", {
        username: "mapper",
        password: "password123",
      }),
    );
    expect(res.status).toBe(409);
  });

  it("成功注册：就地升级匿名行并下发会话", async () => {
    jar.set("user_id", ANON);
    const callRows = [
      [{ id: ANON, username: null }],
      [], // 用户名未占用
    ];
    let i = 0;
    vi.mocked(dbMock.select).mockImplementation(() => {
      const rows = callRows[i] ?? [];
      i += 1;
      const node = {
        from: () => node,
        where: () => node,
        limit: () => Promise.resolve(rows),
      };
      return node as never;
    });

    const res = await register(
      postJson("http://localhost/api/auth/register", {
        username: "Mapper_01",
        password: "password123",
        nickname: "出图工人",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, username: "mapper_01" });
    expect(lastUpdate()).toMatchObject({
      username: "mapper_01",
      nickname: "出图工人",
    });
    expect(typeof lastUpdate()?.passwordHash).toBe("string");
    expect(jar.has("auth_session")).toBe(true);
    expect(jar.has("user_id")).toBe(false);
  });
});

describe("POST /api/auth/login", { timeout: 20_000 }, () => {
  it("错误密码统一 401，不区分用户是否存在", async () => {
    selectRows = [
      {
        id: ACCOUNT,
        username: "mapper",
        passwordHash: hashPassword("correct-pass"),
      },
    ];
    const res = await login(
      postJson("http://localhost/api/auth/login", {
        username: "mapper",
        password: "wrong-pass",
      }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "用户名或密码错误" });
  });

  it("登录成功下发会话；无匿名数据时不触发事务", async () => {
    selectRows = [
      {
        id: ACCOUNT,
        username: "mapper",
        passwordHash: hashPassword("correct-pass"),
      },
    ];
    const res = await login(
      postJson("http://localhost/api/auth/login", {
        username: "Mapper",
        password: "correct-pass",
      }),
    );
    expect(res.status).toBe(200);
    expect(jar.get("auth_session")).toBeTruthy();
  });
});

describe("POST /api/auth/logout 与 GET /me", () => {
  it("logout 清除会话 cookie", async () => {
    jar.set("auth_session", "x");
    const res = await logout();
    expect(res.status).toBe(200);
    expect(jar.has("auth_session")).toBe(false);
  });

  it("me 无会话返回 user:null", async () => {
    const res = await me();
    expect(await res.json()).toEqual({ user: null });
  });
});
