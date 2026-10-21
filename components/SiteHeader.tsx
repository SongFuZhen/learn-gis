import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

/** 移动端顶栏：品牌 + 主题切换（桌面导航由 Sidebar 承担） */
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur lg:hidden">
      <div className="mx-auto flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-brand-gradient text-xs font-semibold text-white">
            G
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            learn-gis
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
