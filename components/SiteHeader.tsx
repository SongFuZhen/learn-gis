"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { GIS_MODULES } from "@/content/gis/modules";
import logoMark from "@/public/brand/logo.png";

/** 静态路由标题：前缀长的放前面，避免 /exam 抢走 /exam/daily */
const STATIC_TITLES: readonly (readonly [prefix: string, title: string])[] = [
  ["/exam/daily", "每日一考"],
  ["/exam/mock", "综合考试"],
  ["/exam", "考试"],
  ["/review", "今日复习"],
  ["/progress", "学习进度"],
  ["/settings", "设置"],
];

/** 按路径推导当前页面标题（首页及未知路径显示「首页」） */
function pageTitle(pathname: string): string {
  for (const [prefix, title] of STATIC_TITLES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return title;
    }
  }
  // 讲义 / 章节测验：/s/gis/{两位章节号}
  const chapter = pathname.match(/^\/s\/gis\/(\d{2})/);
  if (chapter) {
    const mod = GIS_MODULES.find((x) => x.slug === chapter[1]);
    if (mod) {
      return pathname.endsWith("/quiz") ? `测验 · ${mod.title}` : mod.title;
    }
  }
  if (pathname.startsWith("/s/")) return "GIS 基础";
  return "首页";
}

/** 移动端顶栏：品牌 + 当前页面标题 + 主题切换（桌面导航由 Sidebar 承担） */
export default function SiteHeader() {
  const pathname = usePathname();
  const title = pageTitle(pathname);
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur lg:hidden">
      <div className="mx-auto flex h-14 w-full items-center gap-2.5 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="返回首页"
          className="flex shrink-0 items-center"
        >
          <Image src={logoMark} alt="" priority className="h-8 w-8" />
        </Link>
        <h1
          className={
            isHome
              ? "min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight"
              : "min-w-0 flex-1 truncate text-[15px] font-medium tracking-tight text-foreground-secondary"
          }
        >
          {title}
        </h1>
        <ThemeToggle />
      </div>
    </header>
  );
}
