"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

/**
 * 公开昵称编辑：榜单、侧栏等公开位只显示昵称。
 * 登录名不在此修改，也不回显到输入框。
 */
export default function NicknameForm({
  initialNickname,
}: {
  initialNickname: string;
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initialNickname);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; nickname?: string }
        | null;
      if (!res.ok) {
        setError(data?.error ?? "保存失败，请稍后再试");
        return;
      }
      if (data?.nickname) setNickname(data.nickname);
      setSaved(true);
      router.refresh();
    } catch {
      setError("网络异常，请检查连接后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4">
      <label className="block">
        <span className="text-[13px] font-medium">公开昵称</span>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="榜单显示名，2-20 位中英文、数字或下划线"
          maxLength={20}
          required
          className="mt-1.5 h-11 w-full rounded-md border border-input bg-surface px-3 text-[14px] outline-none transition-colors placeholder:text-foreground-muted focus:border-ring"
        />
      </label>
      <p className="mt-1.5 text-[12px] text-foreground-muted">
        允许与他人重名，仅用于榜单、侧栏等公开展示。
      </p>
      {error && (
        <p
          role="alert"
          className="mt-2 rounded-md bg-destructive-light px-3 py-2 text-[13px] text-destructive"
        >
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="mt-2 text-[13px] text-brand">已保存，公开展示即刻生效。</p>
      )}
      <Button type="submit" size="sm" className="mt-3" disabled={pending}>
        {pending ? "保存中…" : "保存昵称"}
      </Button>
    </form>
  );
}
