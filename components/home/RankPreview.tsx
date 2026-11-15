import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/engagement/leaderboard";
import LeaderboardTable from "@/components/rank/LeaderboardTable";

/**
 * 首页榜单摘要：Top 10 + 完整榜单入口。
 * 当前用户不在前 10 时，把自己的名次行追加在末尾。
 */
export default function RankPreview({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string | null;
}) {
  const top = entries.slice(0, 10);
  const own = entries.find((e) => e.isCurrentUser);
  const shown =
    own && !top.some((e) => e.userId === currentUserId) ? [...top, own] : top;

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-medium">学习积分榜</h2>
        <Link
          href="/rank"
          className="inline-flex min-h-8 items-center gap-1 text-[12px] text-foreground-muted transition-colors hover:text-brand"
        >
          完整榜单
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </Link>
      </div>
      <div className="mt-3">
        <LeaderboardTable entries={shown} compact />
      </div>
    </section>
  );
}
