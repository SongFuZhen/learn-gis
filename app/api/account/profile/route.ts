import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { withRetry } from "@/lib/db-retry";
import { getSession, NICKNAME_RE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  nickname: z.string().trim().regex(NICKNAME_RE, "昵称需为 2-20 位中英文、数字、空格、下划线或连字符"),
});

/** 修改公开昵称；登录名不走此接口，避免私密凭据被表单页误展示 */
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "昵称格式不正确" },
      { status: 400 },
    );
  }

  await withRetry(() =>
    db
      .update(users)
      .set({ nickname: parsed.data.nickname })
      .where(eq(users.id, session.userId)),
  );

  return NextResponse.json({ ok: true, nickname: parsed.data.nickname });
}
