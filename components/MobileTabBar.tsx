"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ICONS = {
  home: (
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
  ),
  chapters: (
    <>
      <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v16H6.5A1.5 1.5 0 0 0 5 21.5z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  review: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v4h-4" />
    </>
  ),
  progress: <path d="M4 20V9m6 11V4m6 16v-7" />,
};

const TABS = [
  { href: "/", label: "首页", key: "home" as const, exact: true },
  { href: "/s/gis", label: "章节", key: "chapters" as const, exact: false },
  { href: "/review", label: "复习", key: "review" as const, exact: false },
  { href: "/progress", label: "进度", key: "progress" as const, exact: false },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  // 答题是专注模式：隐藏 tab，把底部留给「提交/下一题」操作条
  if (pathname.endsWith("/quiz")) return null;

  return (
    <>
      {/* 占位，避免固定 tab 遮住页面末尾内容（答题页隐藏 tab 时不留空） */}
      <div
        aria-hidden="true"
        className="h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] sm:hidden"
      />
      <nav
        aria-label="主导航"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/92 backdrop-blur sm:hidden"
      >
        <ul className="pb-safe mx-auto flex max-w-content items-stretch">
          {TABS.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[3.5rem] flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                    active ? "text-accent" : "text-foreground-tertiary",
                  )}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    {ICONS[tab.key]}
                  </svg>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
