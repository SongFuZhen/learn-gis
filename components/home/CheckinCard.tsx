import { CircleCheckBig, Flame } from "lucide-react";
import type { CheckinSummary } from "@/lib/engagement/checkin";

/**
 * 签到卡：自动签到机制下没有按钮，只展示状态与连续天数。
 * 未签时提示去做一套题，已签时亮品牌对勾。
 */
export default function CheckinCard({ summary }: { summary: CheckinSummary }) {
  return (
    <div className="flex h-full items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
      <span
        className={
          summary.checkedToday
            ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-brand-soft text-brand"
            : "flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-surface-muted text-foreground-muted"
        }
      >
        {summary.checkedToday ? (
          <CircleCheckBig className="h-[18px] w-[18px]" strokeWidth={1.7} />
        ) : (
          <Flame className="h-[18px] w-[18px]" strokeWidth={1.7} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium sm:text-sm">
          {summary.checkedToday ? "今日已签到" : "今日待签到"}
        </span>
        <span className="block truncate text-[11px] text-foreground-tertiary sm:text-[12px]">
          {summary.checkedToday
            ? "连续学习中，保持节奏"
            : "做一套题或考试即自动签到"}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block tabular text-[18px] font-semibold leading-none text-brand-ink">
          {summary.current}
          <span className="ml-0.5 text-[11px] font-normal text-foreground-tertiary">
            天连签
          </span>
        </span>
        <span className="mt-1 block text-[11px] tabular text-foreground-muted">
          累计 {summary.totalDays} 天
        </span>
      </span>
    </div>
  );
}
