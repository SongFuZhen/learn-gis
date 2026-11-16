"use client";

import { useEffect } from "react";
import { Focus, Minimize2 } from "lucide-react";
import { useFocusMode } from "@/components/focus/FocusProvider";

/**
 * 讲义页专注开关：隐藏全站外壳与目录浮层，把阅读宽度收束到 736px。
 * 测验/考试由路由强制沉浸，不挂载此组件。
 */
export default function FocusToggle() {
  const { focus, effectiveFocus, setFocus, toggle } = useFocusMode();

  useEffect(() => {
    if (!focus) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFocus(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focus, setFocus]);

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={focus}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-background-subtle px-4 text-sm font-medium text-foreground transition-colors hover:bg-background-hover"
      >
        <Focus className="h-4 w-4" strokeWidth={1.7} />
        {focus ? "退出专注" : "专注模式"}
      </button>

      {effectiveFocus && (
        <button
          type="button"
          onClick={() => setFocus(false)}
          aria-label="退出专注模式"
          className="fixed right-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-card backdrop-blur transition-colors hover:bg-background-hover"
        >
          <Minimize2 className="h-4 w-4" strokeWidth={1.7} />
        </button>
      )}
    </>
  );
}
