/**
 * 认证限流：基于 authAttempts 表的滑动窗口计数。
 * 检查必须发生在 scrypt 校验之前；任何尝试（含失败）都落库，该表同时是审计日志。
 */
import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { authAttempts } from "@/db/schema";

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterSec: number,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

type Kind = "register" | "login";

/** 账号锁定阈值：最近 5 条登录记录全失败 */
export const LOGIN_MAX_FAILS = 5;
/** IP 窗口上限：15 分钟内最多 10 次登录尝试 */
export const LOGIN_IP_MAX = 10;
/** 登录限流窗口（分钟），账号锁定与 IP 窗口共用 */
export const LOGIN_WINDOW_MINUTES = 15;

/** 放行时返回的额度信息，供 route 在失败响应里提示剩余次数 */
export type AuthGate = {
  /** 本次尝试前，账号最近的连续失败次数 */
  consecutiveFails: number;
  /** 账号在锁定前还剩几次尝试 */
  accountRemaining: number;
  /** 该 IP 在窗口内还剩几次尝试 */
  ipRemaining: number;
};

async function countSince(
  where: ReturnType<typeof and>,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(authAttempts)
    .where(where);
  return row?.value ?? 0;
}

/**
 * 注册/登录前置闸门。超限抛 RateLimitError（route 层转 429）。
 * username 统一小写后传入；注册场景可为规范化后的用户名。
 */
export async function assertAuthAllowed(
  kind: Kind,
  ip: string,
  username: string | null,
): Promise<AuthGate> {
  const now = Date.now();

  if (kind === "register") {
    const hourAgo = new Date(now - HOUR);
    const dayAgo = new Date(now - 24 * HOUR);
    const lastHour = await countSince(
      and(
        eq(authAttempts.ip, ip),
        eq(authAttempts.kind, "register"),
        gte(authAttempts.createdAt, hourAgo),
      ),
    );
    if (lastHour >= 5) {
      throw new RateLimitError("注册尝试过于频繁，请 1 小时后再试", HOUR / 1000);
    }
    const lastDay = await countSince(
      and(
        eq(authAttempts.ip, ip),
        eq(authAttempts.kind, "register"),
        gte(authAttempts.createdAt, dayAgo),
      ),
    );
    if (lastDay >= 20) {
      throw new RateLimitError("今日注册次数已达上限，请明天再试", 24 * HOUR / 1000);
    }
    return {
      consecutiveFails: 0,
      accountRemaining: LOGIN_MAX_FAILS,
      ipRemaining: LOGIN_IP_MAX,
    };
  }

  // 登录：IP 窗口 + 账号失败锁定
  const quarterAgo = new Date(now - LOGIN_WINDOW_MINUTES * MINUTE);
  const ipCount = await countSince(
    and(
      eq(authAttempts.ip, ip),
      eq(authAttempts.kind, "login"),
      gte(authAttempts.createdAt, quarterAgo),
    ),
  );
  if (ipCount >= LOGIN_IP_MAX) {
    throw new RateLimitError(
      "尝试次数过多，请 15 分钟后再试",
      LOGIN_WINDOW_MINUTES * 60,
    );
  }

  // 统计账号最近连续失败次数（成功一次即清零），用于锁定判定与剩余次数提示
  let consecutiveFails = 0;
  if (username) {
    const recent = await db
      .select({ success: authAttempts.success, createdAt: authAttempts.createdAt })
      .from(authAttempts)
      .where(
        and(
          eq(authAttempts.username, username),
          eq(authAttempts.kind, "login"),
          gte(authAttempts.createdAt, quarterAgo),
        ),
      )
      .orderBy(desc(authAttempts.createdAt))
      .limit(LOGIN_MAX_FAILS);
    for (const row of recent) {
      if (row.success) break;
      consecutiveFails += 1;
    }
    // 连续失败达到阈值 → 该账号锁 15 分钟
    if (consecutiveFails >= LOGIN_MAX_FAILS) {
      const oldest = recent[recent.length - 1]!.createdAt.getTime();
      const retryAfter = Math.max(
        60,
        Math.round((oldest + LOGIN_WINDOW_MINUTES * MINUTE - now) / 1000),
      );
      throw new RateLimitError("该账号失败次数过多，请稍后再试", retryAfter);
    }
  }

  return {
    consecutiveFails,
    accountRemaining: Math.max(0, LOGIN_MAX_FAILS - consecutiveFails),
    ipRemaining: Math.max(0, LOGIN_IP_MAX - ipCount),
  };
}

/** 记录一次尝试；登录成功时清掉该账号近 15 分钟的失败记录 */
export async function recordAuthAttempt(
  kind: Kind,
  ip: string,
  username: string | null,
  success: boolean,
): Promise<void> {
  await db.insert(authAttempts).values({ ip, username, kind, success });
  if (success && username) {
    await db
      .delete(authAttempts)
      .where(
        and(
          eq(authAttempts.username, username),
          eq(authAttempts.kind, "login"),
          eq(authAttempts.success, false),
          gte(authAttempts.createdAt, new Date(Date.now() - 15 * MINUTE)),
        ),
      );
  }
}
