import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUserId } from "@/lib/api/user";
import { getModule, getSkill } from "@/lib/content";
import { recordLessonView } from "@/lib/engagement/activity";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  skill: z.string().min(1).max(40).default("gis"),
  moduleSlug: z.string().min(1).max(40),
});

/**
 * 讲义阅读上报：首次阅读即建立匿名身份（写 user_id cookie），
 * 随后按「同人同天同章」幂等计入 lesson_views 与当日活跃。
 * 失败只记日志，不影响阅读。
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { skill, moduleSlug } = parsed.data;
  // 只接受 registry 中真实存在的章节，避免垃圾 slug 污染 lesson_views
  if (!getSkill(skill) || !getModule(skill, moduleSlug)) {
    return NextResponse.json({ error: "unknown module" }, { status: 400 });
  }

  try {
    const userId = await getOrCreateUserId();
    await recordLessonView(userId, skill, moduleSlug);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
