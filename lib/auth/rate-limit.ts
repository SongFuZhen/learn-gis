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
): Promise<void> {
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
    return;
  }

  // 登录：IP 窗口 + 账号失败锁定
  const quarterAgo = new Date(now - 15 * MINUTE);
  const ipCount = await countSince(
    and(
      eq(authAttempts.ip, ip),
      eq(authAttempts.kind, "login"),
      gte(authAttempts.createdAt, quarterAgo),
    ),
  );
  if (ipCount >= 10) {
    throw new RateLimitError("尝试次数过多，请 15 分钟后再试", 15 * 60);
  }

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
      .limit(5);
    // 最近 5 次全失败 → 该账号锁 15 分钟
    if (recent.length === 5 && recent.every((r) => r.success === false)) {
      const oldest = recent[recent.length - 1]!.createdAt.getTime();
      const retryAfter = Math.max(
        60,
        Math.round((oldest + 15 * MINUTE - now) / 1000),
      );
      throw new RateLimitError("该账号失败次数过多，请稍后再试", retryAfter);
    }
  }
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
