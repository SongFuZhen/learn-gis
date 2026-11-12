import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";

/** 校验 cookie 里的 user_id 是否为合法 uuid（防止伪造串导致 pg 类型错误） */
const uuidSchema = z.uuid();

/**
 * 从 cookie 取访客用户：
 * - cookie 不存在、不是合法 uuid、或 db 里查无此人 → 新建并写 cookie；
 * - 否则只刷新 lastSeenAt 后复用，绝不直接信任客户端传入的 id 作为外键。
 */
export async function getOrCreateUserId(): Promise<string> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("user_id")?.value;

  if (raw && uuidSchema.safeParse(raw).success) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, raw))
      .limit(1);
    if (existing) {
      await db
        .update(users)
        .set({ lastSeenAt: new Date() })
        .where(eq(users.id, existing.id));
      return existing.id;
    }
  }

  const [created] = await db.insert(users).values({}).returning({ id: users.id });
  if (!created) throw new Error("create user failed");
  cookieStore.set("user_id", created.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return created.id;
}
