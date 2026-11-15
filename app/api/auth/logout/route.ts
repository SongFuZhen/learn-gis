import { NextResponse } from "next/server";
import { clearIdentityCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 无状态会话：登出即清 cookie，后续请求自动回落匿名制 */
export async function POST() {
  await clearIdentityCookies(true);
  return NextResponse.json({ ok: true });
}
