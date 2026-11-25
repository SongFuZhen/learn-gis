"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

/**
 * 修改密码：折叠在设置页账号区，需校验当前密码。
 * 成功后就地收起并清空输入；当前设备保持登录。
 */
export default function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  function clearInputs() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (newPassword !== confirm) {
      setError("两次输入的新密码不一致");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) {
        setError(data?.error ?? "修改失败，请稍后再试");
        return;
      }
      clearInputs();
      setOpen(false);
      setSaved(true);
    } catch {
      setError("网络异常，请检查连接后重试");
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "mt-1.5 h-11 w-full rounded-md border border-input bg-surface px-3 text-[14px] outline-none transition-colors placeholder:text-foreground-muted focus:border-ring";

  return (
    <div className="mt-4 border-t border-border-subtle pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium">密码</p>
          <p className="mt-1 text-[12px] leading-relaxed text-foreground-muted">
            修改后当前设备保持登录；其他设备上已登录的会话不会被强制退出。
          </p>
        </div>
        {!open && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setSaved(false);
              setError(null);
              setOpen(true);
            }}
          >
            修改密码
          </Button>
        )}
      </div>

      {saved && !open && (
        <p className="mt-2 text-[13px] text-brand">密码已更新。</p>
      )}

      {open && (
        <form onSubmit={onSubmit} noValidate className="mt-3 space-y-3">
          <label className="block">
            <span className="text-[13px] font-medium">当前密码</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium">新密码</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少 8 位"
              minLength={8}
              maxLength={128}
              required
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium">确认新密码</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              maxLength={128}
              required
              className={inputClass}
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-md bg-destructive-light px-3 py-2 text-[13px] text-destructive"
            >
              {error}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "保存中…" : "保存新密码"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setError(null);
                clearInputs();
              }}
              disabled={pending}
            >
              取消
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
