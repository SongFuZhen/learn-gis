"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import AuthForm from "@/components/auth/AuthForm";
import logoMark from "@/public/brand/logo.png";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";

/**
 * 全局账号弹层：URL 参数 ?auth=login|register 驱动，任意页面可唤起。
 * 关闭 = 剥掉查询参数回当前路径；切换 tab 同理替换参数，无需独立路由页。
 * 必须包在 Suspense 内使用（useSearchParams 约束）。
 */
export default function AuthModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = searchParams.get("auth");
  const mode: Mode | null = raw === "login" || raw === "register" ? raw : null;

  const [closing, setClosing] = useState(false);
  // 参数被外部剥掉（浏览器后退等）时复位淡出态，避免下次打开停在 opacity-0
  const [prevMode, setPrevMode] = useState<Mode | null>(mode);
  if (mode !== prevMode) {
    setPrevMode(mode);
    if (!mode) setClosing(false);
  }

  // 打开时锁背景滚动；Esc 关闭
  useEffect(() => {
    if (!mode) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function close() {
    setClosing(true);
    // 等淡出动画再剥参数，避免直接闪没
    window.setTimeout(() => {
      router.replace(pathname, { scroll: false });
      setClosing(false);
    }, 120);
  }

  function switchMode(next: Mode) {
    router.replace(`${pathname}?auth=${next}`, { scroll: false });
  }

  if (!mode) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-150",
        closing ? "opacity-0" : "opacity-100",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "login" ? "登录" : "注册"}
    >
      {/* 遮罩 */}
      <button
        type="button"
        aria-label="关闭"
        onClick={close}
        className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
      />

      {/* 卡片 */}
      <div
        className={cn(
          "relative w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-card sm:p-8",
          "transition-all duration-150",
          closing ? "translate-y-2 scale-[0.98]" : "translate-y-0 scale-100",
        )}
      >
        <button
          type="button"
          onClick={close}
          aria-label="关闭弹层"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <X className="h-[18px] w-[18px]" strokeWidth={1.7} />
        </button>

        <div className="flex flex-col items-center text-center">
          <Image src={logoMark} alt="" className="h-11 w-11" priority />
          <h2 className="mt-3 text-[20px] font-semibold tracking-[-0.01em]">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </h2>
          <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-foreground-tertiary">
            {mode === "register"
              ? "注册会把当前浏览器里的学习进度归入账号，不丢任何数据。"
              : "登录后同步该账号在其他设备上的学习进度。"}
          </p>
        </div>

        {/* 登录/注册分段切换 */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-md bg-surface-muted p-1">
          {(["login", "register"] as Mode[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => switchMode(tab)}
              className={cn(
                "h-9 rounded-sm text-[13px] font-medium transition-colors",
                mode === tab
                  ? "bg-card text-brand-ink shadow-card"
                  : "text-foreground-tertiary hover:text-foreground",
              )}
            >
              {tab === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {/* key 保证切换模式时表单状态重置 */}
          <AuthForm key={mode} mode={mode} onSuccess={close} />
        </div>
      </div>
    </div>
  );
}
