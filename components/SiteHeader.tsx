import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import logoMark from "@/public/brand/logo.png";

/** 移动端顶栏：品牌 + 主题切换（桌面导航由 Sidebar 承担） */
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur lg:hidden">
      <div className="mx-auto flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src={logoMark}
            alt=""
            priority
            className="h-8 w-8"
          />
          <span className="text-[15px] font-semibold tracking-tight">
            learn-gis
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
