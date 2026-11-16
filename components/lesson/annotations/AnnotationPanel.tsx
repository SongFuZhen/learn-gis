"use client";

import { useState } from "react";
import Link from "next/link";
import { Highlighter, X } from "lucide-react";
import { MARK_CLASS, type AnnotationKind } from "@/lib/annotations/highlight";
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

  // 类型 → 左侧竖条色：扁平行的唯一强标识，省去整圈描边的视觉重量
  const barClass: Record<AnnotationKind, string> = {
    note: "border-l-info",
    record: "border-l-brand",
    question: "border-l-warning",
  };

  return (
    <ul className="space-y-0.5" data-anno-list>
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
              className={cn(
                "w-full rounded-r-md border-l-2 py-1.5 pl-2.5 pr-2 text-left transition-colors hover:bg-background-subtle disabled:cursor-not-allowed disabled:opacity-60",
                barClass[item.kind],
              )}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    KIND_META[item.kind].dot,
                  )}
                />
                <span className="shrink-0 text-[11px] text-foreground-muted">
                  {KIND_META[item.kind].label}
                </span>
                {lost && (
                  <span className="text-[11px] text-warning">
                    原文已变更
                  </span>
                )}
              </span>
              <span className="mt-0.5 block line-clamp-2 text-[12.5px] leading-snug text-foreground">
                {item.quote}
              </span>
              {item.note && (
                <span className="mt-1 block pl-0.5 text-[11.5px] leading-relaxed text-foreground-tertiary line-clamp-2">
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
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wider text-foreground-muted">
          本章划线 · {items.length}
        </p>
        <Link
          href="/annotations"
          className="shrink-0 text-[11px] font-medium text-brand hover:underline"
        >
          全部
        </Link>
      </div>
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
    <div className="focus-hide fixed right-4 bottom-[9rem] z-30 lg:hidden">
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
            <div className="flex items-center justify-between gap-2 px-2 py-1">
              <p className="text-[11px] uppercase tracking-wider text-foreground-muted">
                本章划线 · {items.length}
              </p>
              <Link
                href="/annotations"
                onClick={() => setOpen(false)}
                className="shrink-0 text-[11px] font-medium text-brand hover:underline"
              >
                全部
              </Link>
            </div>
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
