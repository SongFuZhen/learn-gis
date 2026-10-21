import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { SITE_NAME } from "@/lib/site";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-content items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-tight">
            {SITE_NAME}
          </span>
          <span className="hidden text-xs text-foreground-tertiary sm:inline">
            问答式从 0 学技能
          </span>
        </Link>

        {/* 移动端导航交给底部 tab bar，这里只留主题开关 */}
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-foreground-secondary hover:bg-surface-hover"
          >
            技能
          </Link>
          <Link
            href="/s/gis"
            className="rounded-md px-3 py-2 text-foreground-secondary hover:bg-surface-hover"
          >
            章节
          </Link>
          <Link
            href="/review"
            className="rounded-md px-3 py-2 text-foreground-secondary hover:bg-surface-hover"
          >
            今日复习
          </Link>
          <Link
            href="/progress"
            className="rounded-md px-3 py-2 text-foreground-secondary hover:bg-surface-hover"
          >
            进度
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
