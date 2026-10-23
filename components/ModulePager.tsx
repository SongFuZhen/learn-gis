import { ArrowLeft, ArrowRight, List } from "lucide-react";
import Link from "next/link";
import type { ModuleMeta } from "@/content/gis/modules";
import { cn } from "@/lib/utils";

/**
 * 讲义页「上一章 / 下一章」导航，支持连续阅读。
 * 移动端在顶部紧凑展示；桌面端在正文结束后展示大卡。
 */
export default function ModulePager({
  skillId,
  prev,
  next,
  compact = false,
}: {
  skillId: string;
  prev: ModuleMeta | null;
  next: ModuleMeta | null;
  /** compact: 顶部细条；否则是底部大卡 */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <nav
        aria-label="章节导航"
        className="flex items-center gap-1 rounded-md border border-border bg-card p-1"
      >
        {prev ? (
          <Link
            href={`/s/${skillId}/${prev.slug}`}
            title={prev.title}
            className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-foreground-secondary transition-colors hover:bg-background-hover hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex h-9 w-9 items-center justify-center text-foreground-disabled">
            <ArrowLeft className="h-4 w-4" />
          </span>
        )}
        <Link
          href={`/s/${skillId}`}
          title="全部章节"
          className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-foreground-secondary transition-colors hover:bg-background-hover hover:text-foreground"
        >
          <List className="h-4 w-4" />
        </Link>
        {next ? (
          <Link
            href={`/s/${skillId}/${next.slug}`}
            title={next.title}
            className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-foreground-secondary transition-colors hover:bg-background-hover hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex h-9 w-9 items-center justify-center text-foreground-disabled">
            <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </nav>
    );
  }

  const cell = cn(
    "group flex min-w-0 flex-1 flex-col gap-1 rounded-md border border-border bg-card p-4 shadow-card transition-colors sm:p-5",
  );

  return (
    <nav
      aria-label="章节导航"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {prev ? (
        <Link
          href={`/s/${skillId}/${prev.slug}`}
          className={cn(cell, "hover:border-brand/40 hover:bg-background-subtle")}
        >
          <span className="flex items-center gap-1.5 text-[12px] text-foreground-tertiary">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            上一章 · {prev.slug}
          </span>
          <span className="truncate text-[15px] font-medium text-foreground">
            {prev.title}
          </span>
        </Link>
      ) : (
        <Link
          href={`/s/${skillId}`}
          className={cn(cell, "hover:border-brand/40 hover:bg-background-subtle")}
        >
          <span className="flex items-center gap-1.5 text-[12px] text-foreground-tertiary">
            <List className="h-3.5 w-3.5" />
            这是第一章
          </span>
          <span className="text-[15px] font-medium text-foreground">
            返回章节列表
          </span>
        </Link>
      )}

      {next ? (
        <Link
          href={`/s/${skillId}/${next.slug}`}
          className={cn(
            cell,
            "items-end text-right hover:border-brand/40 hover:bg-background-subtle",
          )}
        >
          <span className="flex items-center gap-1.5 text-[12px] text-foreground-tertiary">
            下一章 · {next.slug}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="truncate text-[15px] font-medium text-foreground">
            {next.title}
          </span>
        </Link>
      ) : (
        <Link
          href={`/s/${skillId}`}
          className={cn(
            cell,
            "items-end text-right hover:border-brand/40 hover:bg-background-subtle",
          )}
        >
          <span className="flex items-center gap-1.5 text-[12px] text-foreground-tertiary">
            已读完全部章节
            <List className="h-3.5 w-3.5" />
          </span>
          <span className="text-[15px] font-medium text-foreground">
            返回章节列表
          </span>
        </Link>
      )}
    </nav>
  );
}
