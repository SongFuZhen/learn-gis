import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { withRetry } from "@/lib/db-retry";
import {
  clearIdentityCookies,
  getClientIp,
  PASSWORD_MAX,
  PASSWORD_MIN,
  setSessionCookie,
  USERNAME_RE,
  verifyPassword,
} from "@/lib/auth";
import {
  assertAuthAllowed,
  type AuthGate,
  LOGIN_IP_MAX,
  LOGIN_MAX_FAILS,
  LOGIN_WINDOW_MINUTES,
  RateLimitError,
  recordAuthAttempt,
} from "@/lib/auth/rate-limit";
import { mergeAnonymousInto } from "@/lib/auth/merge";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().regex(USERNAME_RE, "用户名或密码错误"),
  password: z
    .string()
    .min(PASSWORD_MIN, "用户名或密码错误")
    .max(PASSWORD_MAX, "用户名或密码错误"),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const username = parsed.data.username.toLowerCase();

  let gate: AuthGate | undefined;
  try {
    gate = await assertAuthAllowed("login", ip, username);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: err.message, remaining: 0, lockSeconds: err.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSec) } },
      );
    }
    throw err;
  }

  const [account] = await withRetry(() =>
    db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1),
  );

  // 用户不存在与密码错误走同一分支，防用户名枚举
  if (!account || !verifyPassword(parsed.data.password, account.passwordHash)) {
    await recordAuthAttempt("login", ip, username, false);
    // 本次失败已落库：剩余额度取账号与 IP 两者的较小值
    const remaining = Math.min(
      Math.max(0, (gate?.accountRemaining ?? LOGIN_MAX_FAILS) - 1),
      Math.max(0, (gate?.ipRemaining ?? LOGIN_IP_MAX) - 1),
    );
    return NextResponse.json(
      {
        error: "用户名或密码错误",
        remaining,
        maxAttempts: LOGIN_MAX_FAILS,
        lockMinutes: LOGIN_WINDOW_MINUTES,
      },
      { status: 401 },
    );
  }

  // 跨设备登录：当前设备若有匿名数据，事务内并入账号
  const cookieStore = await cookies();
  const anonId = cookieStore.get("user_id")?.value;
  if (anonId && z.uuid().safeParse(anonId).success && anonId !== account.id) {
    await db.transaction(async (tx) => {
      await mergeAnonymousInto(
        tx as unknown as Parameters<typeof mergeAnonymousInto>[0],
        anonId,
        account.id,
      );
    });
  }

  await setSessionCookie(account.id);
  await clearIdentityCookies(false);
  await recordAuthAttempt("login", ip, username, true);

  return NextResponse.json({ ok: true, username });
}
