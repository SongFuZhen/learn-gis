"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "system", label: "跟随系统", Icon: Monitor },
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
] as const;

/**
 * 外观三态切换：默认跟随系统，用户显式选择后写入 next-themes 持久化。
 * 挂载前不高亮任何项，避免 SSR/CSR 不一致。
 */
export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const active = mounted ? theme : undefined;

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-md bg-background-subtle p-1">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={active === value}
          title={label}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-[12px] font-medium transition-colors",
            active === value
              ? "bg-card text-brand-ink shadow-sm"
              : "text-foreground-muted hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.7} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
