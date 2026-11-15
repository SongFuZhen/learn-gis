import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { getLeaderboard, POINTS } from "@/lib/engagement/leaderboard";
import { resolveUserId } from "@/lib/api/user";
import { getSession } from "@/lib/auth";
import LeaderboardTable from "@/components/rank/LeaderboardTable";

export const metadata: Metadata = {
  title: "排行榜",
  description: "ASoN 学社学习积分榜：答题、考试与签到综合排名。",
};

export const dynamic = "force-dynamic";

const TOP_LIMIT = 50;

export default async function RankPage() {
  const [userId, session] = await Promise.all([
    resolveUserId(),
    getSession(),
  ]);
  const board = await getLeaderboard(userId);
  const visible = board.slice(0, TOP_LIMIT);
  const own = board.find((e) => e.isCurrentUser) ?? null;
  const ownOutsideTop = own && own.rank > TOP_LIMIT;

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
          学习积分榜
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground-secondary">
          仅注册账号上榜。积分 = 答题（{POINTS.perAnswer} 分/题）+ 考试（得分率 ×
          {POINTS.examFactor * 100}%）+ 签到（{POINTS.perCheckinDay} 分/天，连签每天再 +
          {POINTS.perStreakDay}）。
        </p>
      </header>

      {!session && (
        <div className="mt-5 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="text-[14px] font-medium">注册后即可上榜</p>
            <p className="mt-1 text-[12px] leading-relaxed text-foreground-tertiary">
              当前为匿名访客，答题与签到数据保留在本浏览器；注册会把进度就地归入账号并参与排名。
            </p>
          </div>
          <Link
            href="/?auth=register"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.7} />
            注册账号
          </Link>
        </div>
      )}

      <div className="mt-5">
        <LeaderboardTable entries={visible} />
      </div>

      {ownOutsideTop && (
        <div className="mt-3">
          <p className="mb-2 px-1 text-[12px] text-foreground-tertiary">
            你的排名（前 {TOP_LIMIT} 名之外）
          </p>
          <LeaderboardTable entries={[own]} />
        </div>
      )}

      {session && !own && (
        <p className="mt-4 text-[12px] text-foreground-tertiary">
          还没有学习记录，去
          <Link href="/learn" className="mx-1 text-brand hover:underline">
            课程页
          </Link>
          做一套题即可出现在榜上。
        </p>
      )}
    </div>
  );
}
