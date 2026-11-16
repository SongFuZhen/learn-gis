"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * 代码块复制按钮：navigator.clipboard 不可用时（如非安全上下文）静默失败，
 * 用户仍可手动选择文本。
 */
export default function CopyButton({
  text,
  label = "复制",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // 剪贴板权限被拒或环境不支持，不打断阅读
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12px] font-medium text-foreground-secondary transition-colors hover:border-brand/40 hover:text-brand"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success" strokeWidth={2} />
      ) : (
        <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
      )}
      {copied ? "已复制" : label}
    </button>
  );
}
