"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS, NAV_ITEMS, isActive } from "@/components/nav";
import SiteSearch from "@/components/SiteSearch";
import { cn } from "@/lib/utils";
import logoMark from "@/public/brand/logo.png";

/** 桌面主导航：248px 固定侧栏（token: width.sidebar），带品牌色几何背景 */
export default function Sidebar({
  account,
}: {
  account: { displayName: string } | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="focus-hide fixed inset-y-0 left-0 z-30 hidden h-dvh w-sidebar flex-col overflow-hidden border-r border-border bg-card px-3 py-5 lg:flex">
      {/* 背景装饰：顶部品牌光晕 + 几何线稿，纯装饰不参与交互 */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-[hsl(var(--brand-primary)/0.09)] blur-3xl dark:bg-[hsl(var(--brand-primary)/0.16)]" />
        <svg
          className="absolute inset-x-0 top-0 h-64 w-full"
          viewBox="0 0 256 256"
          preserveAspectRatio="xMidYMin slice"
          focusable="false"
        >
          <g
            fill="none"
            stroke="hsl(var(--brand-primary))"
            strokeWidth="1"
          >
            <circle cx="200" cy="40" r="56" strokeOpacity="0.14" />
            <circle cx="200" cy="40" r="30" strokeOpacity="0.10" />
            <ellipse
              cx="200"
              cy="40"
              rx="84"
              ry="24"
              transform="rotate(-18 200 40)"
              strokeOpacity="0.10"
            />
            {Array.from({ length: 5 }, (_, i) => (
              <line
                key={i}
                x1={i * 64}
                y1="0"
                x2={i * 64}
                y2="256"
                strokeOpacity="0.06"
              />
            ))}
          </g>
        </svg>
      </div>

      <div className="relative flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <Image src={logoMark} alt="" priority className="h-9 w-9" />
        <span className="text-[15px] font-semibold tracking-tight">
          ASoN 学社
        </span>
      </Link>

      <div className="mt-6">
        <SiteSearch variant="sidebar" />
      </div>

      <nav className="mt-6 flex flex-col gap-1" aria-label="主导航">
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
        <Link
          href={account ? "/settings" : "/?auth=login"}
          className={
            account
              ? "flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-background-hover"
              : "flex items-center gap-2.5 rounded-md border border-brand/25 bg-brand-soft px-2 py-1.5 transition-colors hover:border-brand/50 hover:bg-brand-soft/70"
          }
        >
          {account ? (
            <>
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[13px] font-medium uppercase text-white">
                {account.displayName.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                  {account.displayName}
                </span>
                <span className="block text-[11px] text-foreground-muted">
                  账号已同步
                </span>
              </span>
            </>
          ) : (
            <>
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-medium text-brand-ink">
                客
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-brand-ink">
                  登录 / 注册
                </span>
                <span className="block text-[11px] text-foreground-muted">
                  跨设备同步进度
                </span>
              </span>
            </>
          )}
        </Link>
      </div>
      </div>
    </aside>
  );
}
