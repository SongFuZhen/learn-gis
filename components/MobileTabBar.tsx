"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS, NAV_ITEMS, isActive } from "@/components/nav";
import { cn } from "@/lib/utils";

export default function MobileTabBar() {
  const pathname = usePathname();

  // 答题是专注模式：隐藏 tab，把底部留给「提交/下一题」操作条
  if (pathname.endsWith("/quiz")) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="h-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:hidden"
      />
      <nav
        aria-label="主导航"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden"
      >
        <ul className="pb-safe mx-auto flex max-w-content items-stretch">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-[4rem] flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                    active ? "font-medium text-brand-ink" : "text-foreground-muted",
                  )}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-brand-gradient"
                    />
                  )}
                  <span
                    className={cn(
                      "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                      active && "bg-brand-soft",
                    )}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      {NAV_ICONS[item.key]}
                    </svg>
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
