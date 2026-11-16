import Link from "next/link";
import { ChartBar } from "lucide-react";
import { PASS_LINE } from "@/lib/quiz/exam";
import type { RecentExam } from "@/lib/progress/home";

type Props = {
  exams: RecentExam[];
};

/** 最近考试成绩柱状图（纯 CSS，80% 虚线为通过线） */
export default function ExamBars({ exams }: Props) {
  if (exams.length === 0) {
    return (
      <div className="flex h-20 flex-col items-center justify-center gap-1.5 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
          <ChartBar className="h-5 w-5" strokeWidth={1.7} />
        </span>
        <p className="text-[12px] text-foreground-tertiary">还没有考试记录</p>
        <Link
          href="/exam/daily"
          className="text-[12px] font-medium text-brand transition-opacity hover:opacity-80"
        >
          考第一场，10 题出成绩 →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <div className="flex h-28 items-end gap-1.5">
          {exams.map((e, i) => {
            const passed = e.mastery >= PASS_LINE;
            return (
              <div
                key={i}
                className="flex h-full min-w-0 flex-1 flex-col justify-end"
              >
                <div
                  className="w-full rounded-t-sm"
                  title={`${e.mode === "daily" ? "每日一考" : "综合考试"} · ${Math.round(e.mastery)}%`}
                  style={{
                    height: `${Math.max(4, e.mastery)}%`,
                    background: passed
                      ? "var(--brand-gradient)"
                      : "hsl(var(--foreground-disabled))",
                  }}
                />
              </div>
            );
          })}
        </div>
        {/* 通过线 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground-muted/60"
          style={{ bottom: `${PASS_LINE}%` }}
        />
      </div>
      <div className="mt-1 flex gap-1.5">
        {exams.map((e, i) => (
          <span
            key={i}
            className="min-w-0 flex-1 truncate text-center text-[9px] tabular text-foreground-tertiary"
          >
            {e.dayLabel}
          </span>
        ))}
      </div>
    </div>
  );
}
