"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Lock, Smile, User } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        | { error?: string }
        | null;
      if (!res.ok) {
        setError(data?.error ?? "请求失败，请稍后再试");
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
            placeholder="4-20 位字母、数字或下划线"
            maxLength={20}
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
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isRegister ? "至少 8 位" : "请输入密码"}
            maxLength={128}
            required
            className={inputClass}
          />
        </div>
      </label>

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
