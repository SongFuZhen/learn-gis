import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-1234567890";

/** 内存 cookie 存储，模拟 next/headers 的只读 store 接口 */
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  })),
}));

import {
  clearIdentityCookies,
  getSession,
  hashPassword,
  RESERVED_USERNAMES,
  setSessionCookie,
  USERNAME_RE,
  verifyPassword,
} from "./auth";

beforeEach(() => jar.clear());

// scrypt（N=16384）单次约 5s，Windows 高负载下需放宽默认 5s 超时
describe("密码哈希 scrypt", { timeout: 20_000 }, () => {
  it("哈希可被正确密码验证", () => {
    const stored = hashPassword("correct horse");
    expect(stored.startsWith("scrypt$16384$8$64$")).toBe(true);
    expect(verifyPassword("correct horse", stored)).toBe(true);
  });

  it("错误密码、null、损坏串均失败且不抛错", () => {
    const stored = hashPassword("correct horse");
    expect(verifyPassword("wrong", stored)).toBe(false);
    expect(verifyPassword("x", null)).toBe(false);
    expect(verifyPassword("x", "garbage")).toBe(false);
    expect(verifyPassword("x", "scrypt$a$b$c$salt$hash")).toBe(false);
  });

  it("同密码两次哈希盐不同，结果不同", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });
});

describe("会话 cookie", () => {
  it("签发后可验签取回 userId", async () => {
    await setSessionCookie("11111111-1111-4111-8111-111111111111");
    const session = await getSession();
    expect(session?.userId).toBe("11111111-1111-4111-8111-111111111111");
    expect(session?.exp).toBeGreaterThan(Date.now());
  });

  it("签名被篡改时拒绝", async () => {
    await setSessionCookie("11111111-1111-4111-8111-111111111111");
    const raw = jar.get("auth_session")!;
    jar.set("auth_session", raw.slice(0, -2) + (raw.endsWith("aa") ? "bb" : "aa"));
    expect(await getSession()).toBeNull();
  });

  it("payload 过期时拒绝", async () => {
    await setSessionCookie("11111111-1111-4111-8111-111111111111");
    const raw = jar.get("auth_session")!;
    const [payload, sig] = raw.split(".");
    const data = JSON.parse(Buffer.from(payload!, "base64url").toString("utf8"));
    data.exp = Date.now() - 1000;
    const expiredPayload = Buffer.from(JSON.stringify(data)).toString("base64url");
    // 用合法结构但过期 payload 替换（签名故意不匹配也应被拒，这里直接改 payload）
    jar.set("auth_session", `${expiredPayload}.${sig}`);
    expect(await getSession()).toBeNull();
  });

  it("无 cookie 与畸形值返回 null", async () => {
    expect(await getSession()).toBeNull();
    jar.set("auth_session", "no-dot");
    expect(await getSession()).toBeNull();
  });

  it("clearIdentityCookies 清掉会话与匿名 cookie", async () => {
    await setSessionCookie("x");
    jar.set("user_id", "anon");
    await clearIdentityCookies(true);
    expect(jar.size).toBe(0);
  });
});

describe("用户名规则", () => {
  it("合法/非法用户名判定", () => {
    expect(USERNAME_RE.test("gis_learner")).toBe(true);
    expect(USERNAME_RE.test("song.fu")).toBe(true);
    expect(USERNAME_RE.test("abc")).toBe(false);
    expect(USERNAME_RE.test("has-dash")).toBe(false);
    expect(USERNAME_RE.test(".abc")).toBe(false);
    expect(USERNAME_RE.test("abc.")).toBe(false);
    expect(USERNAME_RE.test("a..bc")).toBe(false);
    expect(USERNAME_RE.test("a".repeat(21))).toBe(false);
  });

  it("保留字集合覆盖常见系统名", () => {
    expect(RESERVED_USERNAMES.has("admin")).toBe(true);
    expect(RESERVED_USERNAMES.has("root")).toBe(true);
  });
});
