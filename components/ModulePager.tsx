import { ArrowLeft, ArrowRight, List } from "lucide-react";
import Link from "next/link";
import type { ModuleMeta } from "@/content/gis/modules";
import { chapterNo } from "@/lib/content";
import { cn } from "@/lib/utils";

/** 讲义页末尾「上一章 / 下一章」导航，支持连续阅读 */
export default function ModulePager({
  skillId,
  prev,
  next,
}: {
  skillId: string;
  prev: ModuleMeta | null;
  next: ModuleMeta | null;
}) {
  const cell = cn(
    "group flex min-w-0 flex-1 flex-col gap-1 rounded-md border border-border bg-card p-3 shadow-card transition-colors sm:p-5",
  );

  return (
    <nav aria-label="章节导航" className="grid grid-cols-2 gap-2 sm:gap-3">
      {prev ? (
        <Link
          href={`/s/${skillId}/${prev.slug}`}
          className={cn(cell, "hover:border-brand/40 hover:bg-background-subtle")}
        >
          <span className="flex items-center gap-1.5 text-[12px] text-foreground-tertiary">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            上一章 · {chapterNo(prev.slug)}
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
            下一章 · {chapterNo(next.slug)}
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
