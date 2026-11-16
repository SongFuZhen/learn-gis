import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { withRetry } from "@/lib/db-retry";
import { displayNameOf, getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 当前登录态：供导航/设置页判断；未登录统一返回 {user:null}，不报错 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  const [row] = await withRetry(() =>
    db
      .select({
        id: users.id,
        username: users.username,
        nickname: users.nickname,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1),
  );
  if (!row || !row.username) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: { nickname: displayNameOf(row) },
  });
}
