"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS, NAV_ITEMS, isActive } from "@/components/nav";
import ThemeToggle from "@/components/ThemeToggle";
import { GIS_MODULES } from "@/content/gis/modules";
import { ALL_QUESTIONS } from "@/content/gis/all-questions";
import { cn } from "@/lib/utils";
import logoMark from "@/public/brand/logo.png";

/** 桌面主导航：224px 固定侧栏（token: 侧边栏宽度 224px） */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-sidebar flex-col border-r border-border bg-card px-3 py-5 lg:flex">
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <Image src={logoMark} alt="" priority className="h-9 w-9" />
        <span className="text-[15px] font-semibold tracking-tight">
          learn-gis
        </span>
      </Link>

      <nav className="mt-7 flex flex-col gap-1" aria-label="主导航">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = NAV_ICONS[item.key];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2.5 rounded-md px-3 text-sm transition-colors",
                // 四项一视同仁：只有选中态用品牌色 + 淡底胶囊，其余一律中性色
                active
                  ? "bg-brand-soft font-medium text-brand-ink"
                  : "text-foreground-secondary hover:bg-background-hover hover:text-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.7} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div className="rounded-md bg-brand-soft p-3">
          <p className="text-[12px] font-medium text-foreground">
            GIS · {GIS_MODULES.length} 章
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-foreground-muted">
            讲义 → 做题 → 复习，题库共 {ALL_QUESTIONS.length} 题。
          </p>
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="text-[12px] text-foreground-muted">外观</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
