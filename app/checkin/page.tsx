import type { Metadata } from "next";
import Link from "next/link";
import { Flame } from "lucide-react";
import CheckinCalendar from "@/components/engagement/CheckinCalendar";
import { resolveUserId } from "@/lib/api/user";
import { getCheckinSummary } from "@/lib/engagement/checkin";
import { getActivityCalendar } from "@/lib/engagement/activity";
import { dateKey } from "@/lib/quiz/exam";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "打卡",
  description: "打卡日历：按每日答题、讲义阅读与考试量呈现学习热度。",
};

export default async function CheckinPage() {
  const userId = await resolveUserId();
  const yearMonth = dateKey().slice(0, 7);
  const [summary, days] = userId
    ? await Promise.all([
        getCheckinSummary(userId),
        getActivityCalendar(userId, yearMonth),
      ])
    : [null, []];

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px] lg:text-[36px]">
        打卡
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary sm:text-[15px]">
        做题、考试或阅读讲义即自动打卡；格子颜色越深，当天学习量越大。
      </p>

      {!userId || !summary ? (
        <section className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-6 py-14 text-center shadow-card">
          <Flame
            className="h-8 w-8 text-foreground-muted"
            strokeWidth={1.5}
          />
          <p className="text-[14px] font-medium">登录后查看打卡日历</p>
          <p className="max-w-sm text-[13px] text-foreground-tertiary">
            当前为匿名访客，注册或登录后跨设备同步打卡记录与学习数据。
          </p>
          <Link
            href="/?auth=login"
            className="mt-1 inline-flex h-9 items-center rounded-md bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            登录 / 注册
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-4 shadow-card">
              <p className="text-[12px] text-foreground-tertiary">连续打卡</p>
              <p className="mt-1 tabular text-[24px] font-semibold leading-none text-brand-ink">
                {summary.current}
                <span className="ml-0.5 text-[12px] font-normal text-foreground-tertiary">
                  天
                </span>
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-card">
              <p className="text-[12px] text-foreground-tertiary">累计打卡</p>
              <p className="mt-1 tabular text-[24px] font-semibold leading-none text-brand-ink">
                {summary.totalDays}
                <span className="ml-0.5 text-[12px] font-normal text-foreground-tertiary">
                  天
                </span>
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-card">
              <p className="text-[12px] text-foreground-tertiary">今日状态</p>
              <p className="mt-1 text-[18px] font-semibold leading-none">
                {summary.checkedToday ? (
                  <span className="text-brand">已打卡</span>
                ) : (
                  <span className="text-foreground-muted">待打卡</span>
                )}
              </p>
            </div>
          </section>

          <section className="mt-4 rounded-lg border border-border bg-card p-4 shadow-card sm:p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-[15px] font-medium">
                {yearMonth.replace("-", " 年 ")} 月
              </h2>
              <span className="text-[12px] text-foreground-muted">
                历史最长连续 {summary.longest} 天
              </span>
            </div>
            <CheckinCalendar yearMonth={yearMonth} days={days} />
          </section>
        </>
      )}
    </div>
  );
}
