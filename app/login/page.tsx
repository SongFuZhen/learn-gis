import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "登录" };

/** 登录已改为全局弹层（?auth=login），旧路径跳转保留兼容 */
export default async function LoginPage() {
  if (await getSession()) redirect("/settings");
  redirect("/?auth=login");
}
