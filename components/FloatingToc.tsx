"use client";

import { useState } from "react";
import { List, X } from "lucide-react";
import type { TocItem } from "@/lib/toc";
import { cn } from "@/lib/utils";

/** 移动端悬浮「本章目录」：右下角圆钮，点开面板后点条目快速跳转（桌面端用侧栏 TOC） */
export default function FloatingToc({ items }: { items: TocItem[] }) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-[5.5rem] z-30 lg:hidden">
      {/* 展开时点面板外任意处收起 */}
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="relative flex flex-col items-end gap-2">
        {open && (
          <nav
            aria-label="本章目录"
            className="max-h-[50vh] w-60 overflow-y-auto rounded-md border border-border bg-card p-2 shadow-[0_12px_32px_-10px_rgba(20,26,64,0.35)]"
          >
            <p className="px-2 py-1 text-[11px] uppercase tracking-wider text-foreground-muted">
              本章目录 · {items.length} 节
            </p>
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={() => setOpen(false)}
                    className="block truncate rounded-sm px-2 py-1.5 text-[13px] leading-relaxed text-foreground-secondary transition-colors hover:bg-background-hover hover:text-brand"
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "收起本章目录" : "打开本章目录"}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_12px_32px_-10px_rgba(20,26,64,0.35)] backdrop-blur transition-colors",
            open
              ? "border-brand/40 bg-brand-soft text-brand-ink"
              : "border-border bg-card text-foreground-secondary",
          )}
        >
          {open ? (
            <X className="h-5 w-5" strokeWidth={1.7} />
          ) : (
            <List className="h-5 w-5" strokeWidth={1.7} />
          )}
        </button>
      </div>
    </div>
  );
}
