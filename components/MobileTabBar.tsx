"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS, NAV_ITEMS, isActive, isFocusMode } from "@/components/nav";
import { cn } from "@/lib/utils";

export default function MobileTabBar() {
  const pathname = usePathname();

  if (isFocusMode(pathname)) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="h-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:hidden"
      />
      <nav
        aria-label="主导航"
        className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] lg:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch gap-1 rounded-[1.75rem] bg-card/90 p-1 shadow-[0_12px_32px_-10px_rgba(20,26,64,0.35)] backdrop-blur-xl">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item);
            const Icon = NAV_ICONS[item.key];
            const icon = (
              <Icon
                className="h-[18px] w-[18px] shrink-0"
                strokeWidth={1.7}
              />
            );
            return (
              <li key={item.href} className="flex flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[2.75rem] w-full flex-col items-center justify-center gap-1 rounded-[1.2rem] text-[11px] leading-none transition-colors",
                    active
                      ? "bg-brand-soft font-medium text-brand-ink"
                      : "text-foreground-muted active:bg-surface-hover",
                  )}
                >
                  {icon}
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
