import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { withRetry } from "@/lib/db-retry";
import {
  getSession,
  hashPassword,
  PASSWORD_MAX,
  PASSWORD_MIN,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码"),
  newPassword: z
    .string()
    .min(PASSWORD_MIN, `新密码至少 ${PASSWORD_MIN} 位`)
    .max(PASSWORD_MAX, `新密码不超过 ${PASSWORD_MAX} 位`),
});

/**
 * 修改密码：仅限已登录账号，且必须校验当前密码。
 * 无状态会话无法远程失效，改密后为当前设备重新签发并续期；
 * 其他设备已签发的 cookie 仍有效，会在 UI 中提示。
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
        passwordHash: users.passwordHash,
        sessionVersion: users.sessionVersion,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1),
  );

  // 账号不存在或当前密码不符：统一 401，不区分原因
  if (!account || !verifyPassword(currentPassword, account.passwordHash)) {
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

  // 会话版本 +1：其他设备上的旧 cookie 立即失效；当前设备用新版本续签
  await setSessionCookie(account.id, nextVersion);

  return NextResponse.json({ ok: true });
}
