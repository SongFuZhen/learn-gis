/**
 * 账号认证核心：scrypt 密码哈希 + HMAC 签名会话 cookie。
 * 仅依赖 node:crypto，零第三方包。会话无状态（不建 sessions 表），
 * 登出 = 清 cookie；代价是无法服务端强制失效，个人学习站可接受。
 */
import {
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export const USERNAME_RE = /^[a-zA-Z0-9_](?!.*\.\.)(?!.*\.$)[a-zA-Z0-9_.]{2,18}[a-zA-Z0-9_]$/;
/** 昵称面向公开展示：允许中英文、数字、空格、下划线与连字符，2-20 位 */
export const NICKNAME_RE = /^[一-龥a-zA-Z0-9_\- ]{2,20}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** 保留用户名：防冒充系统账号，注册前检查 */
export const RESERVED_USERNAMES = new Set([
  "admin",
  "root",
  "api",
  "system",
  "official",
  "learn-gis",
  "ason",
  "null",
  "undefined",
  "support",
  "help",
]);

/** 留空昵称时生成可辨识但不暴露登录名的公开昵称 */
export function randomNickname(): string {
  return `学员_${randomUUID().slice(0, 4)}`;
}

/** 公开展示名：昵称优先；历史账号缺昵称时按用户 ID 生成稳定兜底 */
export function displayNameOf(user: {
  id: string;
  nickname: string | null;
}): string {
  return user.nickname?.trim() || `学员_${user.id.replaceAll("-", "").slice(0, 4)}`;
}

const SCRYPT_N = 16384;
const SCRYPT_r = 8;
const SCRYPT_p = 64;
const KEY_LEN = 64;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE = "auth_session";

/** 进程内兜底密钥：仅开发环境用，重启即全部登出 */
let devFallbackSecret: string | null = null;

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET (>=32 chars) is required in production");
  }
  if (!devFallbackSecret) {
    devFallbackSecret = randomBytes(32).toString("hex");
    console.warn(
      "[auth] AUTH_SECRET 未配置，使用进程内临时密钥（重启后所有会话失效，仅限开发环境）",
    );
  }
  return devFallbackSecret;
}

/** 哈希串格式：scrypt$N$r$p$saltHex$hashHex（参数自带，未来可调参） */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(
    password + getAuthSecret(),
    salt,
    KEY_LEN,
    { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p, maxmem: 64 * 1024 * 1024 },
  );
  return `scrypt$${SCRYPT_N}$${SCRYPT_r}$${SCRYPT_p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/** 常量时间校验密码；哈希串格式异常一律返回 false，不抛错 */
export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }
  let expected: Buffer;
  let actual: Buffer;
  try {
    const salt = Buffer.from(saltHex!, "hex");
    actual = Buffer.from(hashHex!, "hex");
    expected = scryptSync(password + getAuthSecret(), salt, actual.length, {
      N,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    });
  } catch {
    return false;
  }
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", getAuthSecret()).update(data).digest("base64url");
}

/** 签发会话 cookie（服务端 action/route 内调用） */
export async function setSessionCookie(
  userId: string,
  sessionVersion: number,
): Promise<void> {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = b64url(JSON.stringify({ uid: userId, exp, sv: sessionVersion }));
  const value = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

/** 清除会话与旧匿名 cookie（登出/账号升级后调用） */
export async function clearIdentityCookies(
  includeSession = true,
): Promise<void> {
  const store = await cookies();
  if (includeSession) store.delete(SESSION_COOKIE);
  store.delete("user_id");
}

export type Session = { userId: string; exp: number };

/** 验签 + 过期检查；任何异常一律返回 null（静默回落匿名制） */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return null;
  }
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      uid?: unknown;
      exp?: unknown;
      sv?: unknown;
    };
    if (
      typeof data.uid !== "string" ||
      typeof data.exp !== "number" ||
      data.exp < Date.now()
    ) {
      return null;
    }
    // 会话版本校验：旧 cookie（无 sv 视为 0）与库中版本不一致即失效
    const sv = typeof data.sv === "number" ? data.sv : 0;
    try {
      const [row] = await db
        .select({ sessionVersion: users.sessionVersion })
        .from(users)
        .where(eq(users.id, data.uid))
        .limit(1);
      if (!row || row.sessionVersion !== sv) return null;
    } catch {
      // DB 不可用：回落未登录，宁可要求重登也不放行未知版本
      return null;
    }
    return { userId: data.uid, exp: data.exp };
  } catch {
    return null;
  }
}

/**
 * 取请求真实 IP 用于限流。
 * x-forwarded-for 由客户端可任意伪造，仅在受信反代后才采信：
 * Vercel 运行时或显式 TRUST_PROXY=1 时取 XFF 首段，否则只信 x-real-ip，
 * 都没有则归入 "unknown" 共享桶。
 */
export function getClientIp(req: Request): string {
  const trustProxy =
    process.env.VERCEL === "1" || process.env.TRUST_PROXY === "1";
  if (trustProxy) {
    const xff = req.headers.get("x-forwarded-for");
    const first = xff?.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
