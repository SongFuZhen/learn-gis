"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS, NAV_ITEMS, isActive } from "@/components/nav";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

/** 桌面主导航：224px 固定侧栏（token: 侧边栏宽度 224px） */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-sidebar shrink-0 flex-col border-r border-border bg-card px-3 py-5 lg:flex">
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-gradient text-sm font-semibold text-white shadow-brand">
          G
        </span>
        <span className="text-[15px] font-semibold tracking-tight">
          learn-gis
        </span>
      </Link>

      <nav className="mt-7 flex flex-col gap-1" aria-label="主导航">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2.5 rounded-md px-3 text-sm transition-colors",
                active
                  ? "bg-brand-gradient font-medium text-white shadow-brand"
                  : "text-foreground-secondary hover:bg-background-hover hover:text-foreground",
              )}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[18px] w-[18px]"
                aria-hidden="true"
              >
                {NAV_ICONS[item.key]}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div className="rounded-md bg-brand-soft p-3">
          <p className="text-[12px] font-medium text-foreground">GIS · 6 章</p>
          <p className="mt-1 text-[12px] leading-relaxed text-foreground-muted">
            讲义 → 做题 → 复习，每章 10~15 题。
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
