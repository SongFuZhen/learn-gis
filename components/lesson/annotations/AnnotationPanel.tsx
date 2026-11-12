"use client";

import { useState } from "react";
import { Highlighter, X } from "lucide-react";
import { MARK_CLASS } from "@/lib/annotations/highlight";
import { KIND_META, useAnnotations } from "@/lib/annotations/store";
import { cn } from "@/lib/utils";

function scrollToAnnotation(id: string) {
  const mark = document.querySelector<HTMLElement>(
    `mark.${MARK_CLASS}[data-annotation-id="${CSS.escape(id)}"]`,
  );
  if (!mark) return;
  mark.scrollIntoView({ behavior: "smooth", block: "center" });
  mark.classList.add("anno-flash");
  window.setTimeout(() => mark.classList.remove("anno-flash"), 1200);
}

function AnnotationList({
  onNavigate,
}: {
  onNavigate?: (id: string) => void;
}) {
  const { items, unresolved } = useAnnotations();

  if (items.length === 0) {
    return (
      <p className="px-1 py-2 text-[13px] leading-relaxed text-foreground-tertiary">
        还没有划线。选中讲义文字即可添加备注、记录或疑问。
      </p>
    );
  }

  return (
    <ul className="space-y-1" data-anno-list>
      {items.map((item) => {
        const lost = unresolved.includes(item.id);
        return (
          <li key={item.id}>
            <button
              type="button"
              data-anno-item={item.id}
              disabled={lost}
              onClick={() => {
                scrollToAnnotation(item.id);
                onNavigate?.(item.id);
              }}
              className="w-full rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-background-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    KIND_META[item.kind].dot,
                  )}
                />
                <span className="shrink-0 text-[11px] text-foreground-muted">
                  {KIND_META[item.kind].label}
                </span>
                {lost && (
                  <span className="text-[11px] text-warning">
                    原文已变更，无法定位
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-foreground-secondary">
                {item.quote}
              </span>
              {item.note && (
                <span className="mt-0.5 block truncate text-[12px] text-foreground-tertiary">
                  {item.note}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** 桌面端：挂进讲义页右侧 aside（TOC 下方） */
export default function AnnotationPanel() {
  const { items } = useAnnotations();
  return (
    <section className="mt-3 border-t border-border-subtle pt-3">
      <p className="text-[11px] uppercase tracking-wider text-foreground-muted">
        本章划线 · {items.length}
      </p>
      <div className="mt-2 max-h-[34vh] overflow-y-auto">
        <AnnotationList />
      </div>
    </section>
  );
}

/** 移动端：右下角悬浮按钮 + 抽屉（模式同 FloatingToc） */
export function AnnotationPanelMobile() {
  const [open, setOpen] = useState(false);
  const { items } = useAnnotations();

  if (items.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-[9rem] z-30 lg:hidden">
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
            aria-label="本章划线"
            className="max-h-[50vh] w-72 overflow-y-auto rounded-md border border-border bg-card p-2 shadow-[0_12px_32px_-10px_rgba(20,26,64,0.35)]"
          >
            <p className="px-2 py-1 text-[11px] uppercase tracking-wider text-foreground-muted">
              本章划线 · {items.length}
            </p>
            <AnnotationList onNavigate={() => setOpen(false)} />
          </nav>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "收起划线列表" : "打开划线列表"}
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
            <Highlighter className="h-5 w-5" strokeWidth={1.7} />
          )}
        </button>
      </div>
    </div>
  );
}
