"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Smile, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AuthErrorPayload = {
  error?: string;
  remaining?: number;
  maxAttempts?: number;
  lockMinutes?: number;
  lockSeconds?: number;
};

/** 把接口返回的剩余额度拼成可读提示；缺字段时退回原始错误文案 */
function formatAuthError(data: AuthErrorPayload | null): string {
  const base = data?.error ?? "请求失败，请稍后再试";
  if (typeof data?.remaining !== "number") return base;
  if (data.remaining <= 0) {
    const lockMinutes =
      data.lockMinutes ??
      (typeof data.lockSeconds === "number"
        ? Math.ceil(data.lockSeconds / 60)
        : 15);
    return `${base}（账号临时锁定，请约 ${lockMinutes} 分钟后再试）`;
  }
  return `${base}，还可尝试 ${data.remaining} 次；连续 ${
    data.maxAttempts ?? 5
  } 次错误将锁定 ${data.lockMinutes ?? 15} 分钟`;
}

/**
 * 登录/注册共用表单字段（无外层卡片，卡片由 AuthModal 提供）。
 * 成功后回调 onSuccess，由弹层负责关闭与刷新。
 */
export default function AuthForm({
  mode,
  onSuccess,
}: {
  mode: "login" | "register";
  onSuccess: () => void;
}) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          ...(isRegister && nickname.trim()
            ? { nickname: nickname.trim() }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | AuthErrorPayload
        | null;
      if (!res.ok) {
        setError(formatAuthError(data));
        return;
      }
      onSuccess();
      router.refresh();
    } catch {
      setError("网络异常，请检查连接后重试");
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "h-11 w-full rounded-md border border-input bg-surface pl-10 pr-3 text-[14px] outline-none transition-colors placeholder:text-foreground-muted focus:border-ring";

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <label className="block">
        <span className="text-[13px] font-medium">用户名</span>
        <div className="relative mt-1.5">
          <User
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
            strokeWidth={1.7}
          />
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="4-20 位字母、数字、下划线或小数点"
            maxLength={20}
            minLength={4}
            pattern="[a-zA-Z0-9_](?!.*\.\.)(?!.*\.$)[a-zA-Z0-9_.]{2,18}[a-zA-Z0-9_]"
            title="4-20 位字母、数字、下划线或小数点，小数点不能在首尾或连续出现"
            required
            className={inputClass}
          />
        </div>
      </label>

      {isRegister && (
        <label className="block">
          <span className="text-[13px] font-medium">昵称（选填）</span>
          <div className="relative mt-1.5">
            <Smile
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
              strokeWidth={1.7}
            />
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="榜单显示名，留空自动生成"
              maxLength={20}
              className={inputClass}
            />
          </div>
        </label>
      )}

      <label className="block">
        <span className="text-[13px] font-medium">密码</span>
        <div className="relative mt-1.5">
          <Lock
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
            strokeWidth={1.7}
          />
          <input
            type={showPassword ? "text" : "password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isRegister ? "至少 8 位" : "请输入密码"}
            maxLength={128}
            minLength={isRegister ? 8 : undefined}
            required
            className={cn(inputClass, "pr-10")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-foreground-muted transition-colors hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.7} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.7} />
            )}
          </button>
        </div>
      </label>

      {!isRegister && (
        <p className="text-[12px] leading-relaxed text-foreground-muted">
          连续 5 次输错密码将锁定 15 分钟；登录成功后失败记录自动清零。
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-light px-3 py-2 text-[13px] text-destructive"
        >
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "请稍候…" : isRegister ? "注册并绑定当前进度" : "登录"}
      </Button>
    </form>
  );
}
