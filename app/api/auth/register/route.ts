import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { withRetry } from "@/lib/db-retry";
import {
  clearIdentityCookies,
  getClientIp,
  hashPassword,
  NICKNAME_RE,
  PASSWORD_MAX,
  PASSWORD_MIN,
  randomNickname,
  RESERVED_USERNAMES,
  setSessionCookie,
  USERNAME_RE,
} from "@/lib/auth";
import {
  assertAuthAllowed,
  RateLimitError,
  recordAuthAttempt,
} from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  username: z.string().regex(USERNAME_RE, "用户名需为 4-20 位字母、数字或下划线"),
  password: z
    .string()
    .min(PASSWORD_MIN, `密码至少 ${PASSWORD_MIN} 位`)
    .max(PASSWORD_MAX, `密码不超过 ${PASSWORD_MAX} 位`),
  nickname: z.string().trim().regex(NICKNAME_RE).optional(),
});

/**
 * 注册两条路径：有效匿名 user_id 时就地升级该 users 行（业务表数据零搬运）；
 * 无匿名身份的全新访客直接新建账号行。
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const username = parsed.data.username.toLowerCase();
  const nickname = parsed.data.nickname || randomNickname();
  if (RESERVED_USERNAMES.has(username)) {
    return NextResponse.json(
      { error: "该用户名不可使用，请换一个" },
      { status: 400 },
    );
  }

  try {
    await assertAuthAllowed("register", ip, username);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: err.message },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSec) } },
      );
    }
    throw err;
  }

  // 两种入口：有匿名行则就地升级（业务表外键不动）；
  // 全新访客（无 cookie / 行已失效）直接新建账号行，不阻断注册
  const cookieStore = await cookies();
  const anonId = cookieStore.get("user_id")?.value;
  const validAnonId =
    anonId && z.uuid().safeParse(anonId).success ? anonId : null;

  try {
    let targetId: string | null = null;
    if (validAnonId) {
      const [anonRow] = await withRetry(() =>
        db
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(eq(users.id, validAnonId))
          .limit(1),
      );
      if (anonRow?.username) {
        return NextResponse.json(
          { error: "当前访客已注册账号，请直接登录" },
          { status: 409 },
        );
      }
      if (anonRow) targetId = anonRow.id;
    }

    const [nameTaken] = await withRetry(() =>
      db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .limit(1),
    );
    if (nameTaken) {
      await recordAuthAttempt("register", ip, username, false);
      return NextResponse.json(
        { error: "用户名已被占用" },
        { status: 409 },
      );
    }

    const passwordHash = hashPassword(parsed.data.password);
    const userId = targetId ?? randomUUID();
    if (targetId) {
      await withRetry(() =>
        db
          .update(users)
          .set({ username, nickname, passwordHash })
          .where(eq(users.id, userId)),
      );
    } else {
      await withRetry(() =>
        db.insert(users).values({ id: userId, username, nickname, passwordHash }),
      );
    }

    await setSessionCookie(userId);
    await clearIdentityCookies(false);
    await recordAuthAttempt("register", ip, username, true);

    return NextResponse.json({ ok: true, username });
  } catch (err) {
    // 唯一索引并发冲突（两个请求同时抢同一用户名）
    if (
      err instanceof Error &&
      err.message.includes("uq_users_username")
    ) {
      return NextResponse.json(
        { error: "用户名已被占用" },
        { status: 409 },
      );
    }
    throw err;
  }
}
