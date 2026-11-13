"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { searchContent, type SearchHit } from "@/lib/search";

type Props = {
  variant: "mobile" | "sidebar";
};

function ResultList({
  hits,
  query,
  onNavigate,
}: {
  hits: SearchHit[];
  query: string;
  onNavigate: () => void;
}) {
  if (query.trim().length < 2) {
    return (
      <p className="px-3 py-3 text-[12px] leading-relaxed text-foreground-tertiary">
        输入至少 2 个字，搜索章节和题目。
      </p>
    );
  }

  if (hits.length === 0) {
    return (
      <p className="px-3 py-3 text-[12px] leading-relaxed text-foreground-tertiary [overflow-wrap:anywhere]">
        没有找到「{query.trim()}」相关内容。
      </p>
    );
  }

  return (
    <ul className="py-1" aria-label="搜索结果">
      {hits.map((hit) => (
        <li key={hit.key}>
          <Link
            href={hit.href}
            onClick={onNavigate}
            className="flex min-h-11 items-start gap-2 px-3 py-2.5 transition-colors hover:bg-background-hover"
          >
            <span className="mt-0.5 shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-foreground-tertiary">
              {hit.where === "chapter" ? "章节" : "题目"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-foreground">
                {hit.title}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-[12px] leading-relaxed text-foreground-tertiary [overflow-wrap:anywhere]">
                {hit.snippet}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-foreground-muted">
                {hit.skillTitle} · {hit.chapterTitle}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function SiteSearch({ variant }: Props) {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const mobilePanelId = useId();
  const hits = useMemo(() => searchContent(query), [query]);

  const closeMobileSearch = (returnFocus = false) => {
    setMobileOpen(false);
    setQuery("");
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileSearch(true);
        return;
      }
      if (event.key !== "Tab" || !mobilePanelRef.current) return;

      const focusables = Array.from(
        mobilePanelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusables.length === 0) return;

      const first = focusables.at(0);
      const last = focusables.at(-1);
      if (!first || !last) return;
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  if (variant === "mobile") {
    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          aria-label="打开搜索"
          aria-expanded={mobileOpen}
          aria-controls={mobileOpen ? mobilePanelId : undefined}
          aria-haspopup="dialog"
          onClick={() => {
            setMobileOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-background-hover"
        >
          <Search className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </button>

        {mobileOpen && (
          <>
            <button
              type="button"
              aria-label="关闭搜索"
              tabIndex={-1}
              onClick={() => closeMobileSearch(true)}
              className="fixed inset-0 top-14 z-40 cursor-default bg-background/40 backdrop-blur-sm lg:hidden"
            />
            <div
              ref={mobilePanelRef}
              id={mobilePanelId}
              role="dialog"
              aria-modal="true"
              aria-label="搜索章节或题目"
              className="fixed inset-x-0 top-14 z-50 border-b border-border bg-background/95 shadow-card backdrop-blur-xl lg:hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">搜索章节或题目</span>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
                    strokeWidth={1.8}
                  />
                  <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索章节 / 题目关键词"
                    autoComplete="off"
                    className="h-11 w-full min-w-0 rounded-md border border-border bg-card py-2 pl-9 pr-3 text-[14px] outline-none [overflow-wrap:anywhere] placeholder:text-foreground-disabled focus:border-brand/50"
                  />
                </label>
                <button
                  type="button"
                  aria-label="关闭搜索"
                  onClick={() => closeMobileSearch(true)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-foreground-secondary hover:bg-background-hover"
                >
                  <X className="h-5 w-5" strokeWidth={1.8} />
                </button>
              </div>
              <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto border-t border-border-subtle px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                <ResultList
                  hits={hits}
                  query={query}
                  onNavigate={() => closeMobileSearch(false)}
                />
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div className="relative px-2">
      <label className="relative block">
        <span className="sr-only">搜索章节或题目</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
          strokeWidth={1.8}
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索章节 / 题目"
          autoComplete="off"
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
          }}
          className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-[13px] outline-none placeholder:text-foreground-disabled focus:border-brand/50"
        />
      </label>
      {query.length > 0 && (
        <div className="absolute left-2 right-2 top-12 z-40 max-h-[min(24rem,60vh)] overflow-y-auto rounded-md border border-border bg-card shadow-card">
          <ResultList hits={hits} query={query} onNavigate={() => setQuery("")} />
        </div>
      )}
    </div>
  );
}
