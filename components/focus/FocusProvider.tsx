"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { isFocusMode } from "@/components/nav";
import { readFocusPref, writeFocusPref } from "@/lib/focus";

type FocusContextValue = {
  /** 手动偏好（讲义页可切换） */
  focus: boolean;
  /** 实际生效状态：手动偏好或测验/考试路由强制沉浸 */
  effectiveFocus: boolean;
  setFocus: (enabled: boolean) => void;
  toggle: () => void;
};

const FocusContext = createContext<FocusContextValue | null>(null);

/** 同文档内偏好变化事件（storage 事件不在写入方文档触发，需自定义通知） */
const FOCUS_EVENT = "learn-gis:focus-change";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(FOCUS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(FOCUS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function FocusProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // localStorage 是外部存储：useSyncExternalStore 保证水合后再读客户端快照，
  // 服务端快照恒为 false，避免首屏 HTML 与客户端不一致
  const focus = useSyncExternalStore(
    subscribe,
    () => readFocusPref(),
    () => false,
  );

  const forcedFocus = isFocusMode(pathname);
  const effectiveFocus = focus || forcedFocus;

  useEffect(() => {
    document.documentElement.classList.toggle(
      "focus-mode",
      effectiveFocus,
    );
    return () => {
      document.documentElement.classList.remove("focus-mode");
    };
  }, [effectiveFocus]);

  const setFocus = useCallback((enabled: boolean) => {
    writeFocusPref(enabled);
    window.dispatchEvent(new Event(FOCUS_EVENT));
  }, []);

  const value = useMemo<FocusContextValue>(
    () => ({
      focus,
      effectiveFocus,
      setFocus,
      toggle: () => setFocus(!focus),
    }),
    [effectiveFocus, focus, setFocus],
  );

  return (
    <FocusContext.Provider value={value}>{children}</FocusContext.Provider>
  );
}

export function useFocusMode(): FocusContextValue {
  const ctx = useContext(FocusContext);
  if (!ctx) {
    throw new Error("useFocusMode must be used within FocusProvider");
  }
  return ctx;
}
