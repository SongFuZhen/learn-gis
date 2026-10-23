import type { RecentExam } from "@/lib/progress/home";

const PASS_LINE = 80;

type Props = {
  exams: RecentExam[];
};

/** 最近考试成绩柱状图（纯 CSS，80% 虚线为通过线） */
export default function ExamBars({ exams }: Props) {
  if (exams.length === 0) {
    return (
      <p className="flex h-28 items-center justify-center text-[12px] text-foreground-tertiary">
        还没有考试记录，去考一场就有曲线了
      </p>
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
