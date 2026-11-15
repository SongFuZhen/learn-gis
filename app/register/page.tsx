import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "注册" };

/** 注册已改为全局弹层（?auth=register），旧路径跳转保留兼容 */
export default async function RegisterPage() {
  if (await getSession()) redirect("/settings");
  redirect("/?auth=register");
}
