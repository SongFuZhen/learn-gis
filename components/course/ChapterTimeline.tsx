import Link from "next/link";
import { ArrowRight, Circle, CircleCheck, CircleDot } from "lucide-react";
import type { ModuleMeta } from "@/content/types";
import { chapterNo } from "@/lib/content";
import { PASS_LINE } from "@/lib/quiz/exam";

type ChapterRow = {
  slug: string;
  mastery: number;
  quizCount: number;
};

/**
 * 课程大纲时间线：三态（通关/学习中/未开始）+ 题量与掌握度。
 * chapters 为 null 时（新访客/DB 不可用）全部按未开始渲染。
 */
export default function ChapterTimeline({
  skillId,
  modules,
  chapters,
  questionCounts,
}: {
  skillId: string;
  modules: ModuleMeta[];
  chapters: Map<string, ChapterRow> | null;
  questionCounts: Record<string, number>;
}) {
  return (
    <ol className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
      {modules.map((m, idx) => {
        const row = chapters?.get(m.slug) ?? null;
        const passed = row !== null && row.quizCount > 0 && row.mastery >= PASS_LINE;
        const learning = row !== null && row.quizCount > 0 && !passed;
        const cta = passed ? "复习" : learning ? "继续" : "开始";

        return (
          <li key={m.slug}>
            <Link
              href={`/s/${skillId}/${m.slug}`}
              className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-background-subtle sm:px-5"
            >
              {passed ? (
                <CircleCheck
                  className="h-5 w-5 shrink-0 text-success"
                  strokeWidth={1.7}
                />
              ) : learning ? (
                <CircleDot
                  className="h-5 w-5 shrink-0 text-brand"
                  strokeWidth={1.7}
                />
              ) : (
                <Circle
                  className="h-5 w-5 shrink-0 text-foreground-disabled"
                  strokeWidth={1.7}
                />
              )}

              <span className="w-8 shrink-0 font-mono text-[11px] text-foreground-muted">
                {chapterNo(m.slug)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium sm:text-[15px]">
                  {m.title}
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-foreground-tertiary">
                  {m.summary}
                </span>
              </span>

              <span className="hidden shrink-0 items-center gap-1.5 text-[12px] tabular text-foreground-tertiary sm:flex">
                <span className="rounded-full bg-surface-muted px-2 py-0.5">
                  {questionCounts[m.slug] ?? 0} 题
                </span>
                {row && row.quizCount > 0 ? (
                  <span
                    className={
                      passed
                        ? "font-medium text-success"
                        : "font-medium text-brand-ink"
                    }
                  >
                    {Math.round(row.mastery)}%
                  </span>
                ) : (
                  <span>未开始</span>
                )}
              </span>

              <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand">
                {cta}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </span>
            </Link>
            {idx < modules.length - 1 && (
              <div className="ml-12 border-t border-border-subtle" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
