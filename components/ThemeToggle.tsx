"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // 仅客户端挂载后才读 resolvedTheme，避免 SSR/CSR 图标不一致
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="切换明暗主题"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-9 w-9"
    >
      {isDark ? (
        <Sun className="h-[18px] w-[18px]" strokeWidth={1.7} />
      ) : (
        <Moon className="h-[18px] w-[18px]" strokeWidth={1.7} />
      )}
    </Button>
  );
}
