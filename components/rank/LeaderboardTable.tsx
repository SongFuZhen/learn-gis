import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/engagement/leaderboard";

/** 前三名的名次色，沿用既有 token，不引入新色 */
const RANK_CLASS: Record<number, string> = {
  1: "text-brand-gold",
  2: "text-foreground-secondary",
  3: "text-brand-cyan",
};

/**
 * 积分榜表格：纯展示。compact 用于首页 Top10 摘要，隐藏部分列。
 * 当前用户行高亮，方便在长榜里定位自己。
 */
export default function LeaderboardTable({
  entries,
  compact = false,
}: {
  entries: LeaderboardEntry[];
  compact?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-[13px] text-foreground-tertiary">
        还没有账号上榜，做一套题拿下第一名。
      </p>
    );
  }

  return (
    <ul className="overflow-hidden rounded-lg border border-border bg-card">
      {entries.map((entry) => (
        <li
          key={entry.userId}
          className={cn(
            "flex items-center gap-3 px-4 py-3 text-[13px] sm:gap-4",
            entry.rank > 1 && "border-t border-border-subtle",
            entry.isCurrentUser && "bg-brand-soft",
          )}
        >
          <span
            className={cn(
              "w-7 shrink-0 text-center text-[14px] font-semibold tabular",
              RANK_CLASS[entry.rank] ?? "text-foreground-tertiary",
            )}
          >
            {entry.rank}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">
            {entry.displayName}
            {entry.isCurrentUser && (
              <span className="ml-2 rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-normal text-brand-ink dark:bg-white/15 dark:text-white">
                我
              </span>
            )}
          </span>
          {!compact && (
            <>
              <span className="hidden w-16 shrink-0 text-right text-[12px] tabular text-foreground-tertiary sm:block">
                {entry.answered} 题
              </span>
              <span className="hidden w-16 shrink-0 text-right text-[12px] tabular text-foreground-tertiary sm:block">
                连 {entry.streak} 天
              </span>
            </>
          )}
          <span className="w-16 shrink-0 text-right text-[14px] font-semibold tabular text-brand-ink">
            {entry.points}
            <span className="ml-0.5 text-[11px] font-normal text-foreground-tertiary">
              分
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
