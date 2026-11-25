import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { withRetry } from "@/lib/db-retry";
import {
  getClientIp,
  getSession,
  hashPassword,
  PASSWORD_MAX,
  PASSWORD_MIN,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import {
  assertChangePasswordAllowed,
  RateLimitError,
  recordAuthAttempt,
} from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z
    .string()
    .min(1, "请输入当前密码")
    .max(PASSWORD_MAX, "当前密码格式不正确"),
  newPassword: z
    .string()
    .min(PASSWORD_MIN, `新密码至少 ${PASSWORD_MIN} 位`)
    .max(PASSWORD_MAX, `新密码不超过 ${PASSWORD_MAX} 位`),
});

/**
 * 修改密码：仅限已登录账号，且必须校验当前密码。
 * 校验通过后 session_version + 1 并重新签发当前设备，
 * 其他设备上 sv 落后的旧 cookie 下一次请求即失效（强制重新登录）。
 * 连续失败达阈值会临时锁定，防止在线爆破当前密码。
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "新密码不符合要求" },
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = parsed.data;
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "新密码不能与当前密码相同" },
      { status: 400 },
    );
  }

  const [account] = await withRetry(() =>
    db
      .select({
        id: users.id,
        username: users.username,
        passwordHash: users.passwordHash,
        sessionVersion: users.sessionVersion,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1),
  );

  if (!account) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limitKey = account.username ?? account.id;

  // 连续失败达阈值先拦截，避免在线爆破当前密码
  try {
    await assertChangePasswordAllowed(limitKey);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: err.message },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSec) } },
      );
    }
    throw err;
  }

  // 当前密码不符：记一次失败并统一 401
  if (!verifyPassword(currentPassword, account.passwordHash)) {
    await recordAuthAttempt("change-password", ip, limitKey, false);
    return NextResponse.json({ error: "当前密码不正确" }, { status: 401 });
  }

  const passwordHash = hashPassword(newPassword);
  const nextVersion = account.sessionVersion + 1;
  await withRetry(() =>
    db
      .update(users)
      .set({ passwordHash, sessionVersion: nextVersion })
      .where(eq(users.id, account.id)),
  );

  await recordAuthAttempt("change-password", ip, limitKey, true);
  // 会话版本 +1：其他设备上的旧 cookie 立即失效；当前设备用新版本续签
  await setSessionCookie(account.id, nextVersion);

  return NextResponse.json({ ok: true });
}
