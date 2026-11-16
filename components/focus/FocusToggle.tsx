"use client";

import { useEffect } from "react";
import { Focus, Minimize2 } from "lucide-react";
import { useFocusMode } from "@/components/focus/FocusProvider";

/**
 * 讲义页专注开关：隐藏全站外壳与目录浮层，把阅读宽度收束到 736px，
 * 同时请求浏览器原生全屏。测验/考试由路由强制沉浸，不挂载此组件。
 * 无全屏权限的环境（如部分 iframe）静默降级为仅站内沉浸。
 */
async function enterFullscreen() {
  try {
    await document.documentElement.requestFullscreen();
  } catch {
    // requestFullscreen 被拒或环境不支持：站内 focus-mode 仍然生效
  }
}

async function exitFullscreen() {
  if (!document.fullscreenElement) return;
  try {
    await document.exitFullscreen();
  } catch {
    // ignore
  }
}

export default function FocusToggle() {
  const { focus, effectiveFocus, setFocus } = useFocusMode();

  useEffect(() => {
    if (!focus) return;
    // 浏览器层 Esc 退出原生全屏时，同步关掉站内专注状态
    function onFullscreenChange() {
      if (!document.fullscreenElement) setFocus(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFocus(false);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [focus, setFocus]);

  // 任意路径退出专注（按钮 / Esc / fullscreenchange）都要释放原生全屏
  useEffect(() => {
    if (!focus) void exitFullscreen();
  }, [focus]);

  function handleClick() {
    if (focus) {
      setFocus(false);
      return;
    }
    setFocus(true);
    // 必须在点击手势内请求，浏览器才授予全屏
    void enterFullscreen();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={focus}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-brand/30 bg-brand-soft px-4 text-sm font-medium text-brand-ink shadow-card transition-colors hover:border-brand/50 hover:bg-brand-soft/70"
      >
        <Focus className="h-4 w-4" strokeWidth={1.8} />
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
