"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SiteSearch from "@/components/SiteSearch";
import { pageTitle } from "@/lib/page-title";
import logoMark from "@/public/brand/logo.png";

/** 移动端顶栏：品牌 + 当前页面标题 + 搜索（主题切换收在 /settings） */
export default function SiteHeader() {
  const pathname = usePathname();
  const title = pageTitle(pathname);
  const isHome = pathname === "/";

  return (
    <header className="focus-hide sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur lg:hidden">
      <div className="mx-auto flex h-14 w-full items-center gap-2.5 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="返回首页"
          className="flex shrink-0 items-center"
        >
          <Image src={logoMark} alt="" priority className="h-8 w-8" />
        </Link>
        <p
          className={
            isHome
              ? "min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight"
              : "min-w-0 flex-1 truncate text-[15px] font-medium tracking-tight text-foreground-secondary"
          }
        >
          {title}
        </p>
        <SiteSearch variant="mobile" />
      </div>
    </header>
  );
}
