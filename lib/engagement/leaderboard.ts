import { desc, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { checkIns, examSessions, moduleProgress, users } from "@/db/schema";
import { withRetry } from "@/lib/db-retry";
import { getStreak } from "@/lib/engagement/checkin";
import { displayNameOf } from "@/lib/auth";

/**
 * 积分公式（读时实时计算，不落库）：
 * - 答题：每提交 1 题 1 分（moduleProgress.totalAttempts 求和）
 * - 考试：每场 mastery(0~100) × 0.5，即 80% 卷得 40 分
 * - 签到：每签 1 天 5 分，当前连续 streak 每天额外 3 分
 */
export const POINTS = {
  perAnswer: 1,
  examFactor: 0.5,
  perCheckinDay: 5,
  perStreakDay: 3,
} as const;

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  points: number;
  answered: number;
  examCount: number;
  checkinDays: number;
  streak: number;
  isCurrentUser: boolean;
};

/**
 * 全站总榜：仅注册账号（username 非空）上榜，匿名访客排除。
 * 三条 group-by 聚合 + 一次签到明细查询，JS 内合并；DB 异常回落空数组。
 */
export async function getLeaderboard(
  currentUserId?: string | null,
): Promise<LeaderboardEntry[]> {
  try {
    const [accounts, progressRows, examRows, checkinRows] = await Promise.all([
      withRetry(() =>
        db
          .select({
            id: users.id,
            username: users.username,
            nickname: users.nickname,
          })
          .from(users)
          .where(isNotNull(users.username)),
      ),
      withRetry(() =>
        db
          .select({
            userId: moduleProgress.userId,
            answered: sql<number>`coalesce(sum(${moduleProgress.totalAttempts}), 0)::int`,
          })
          .from(moduleProgress)
          .groupBy(moduleProgress.userId),
      ),
      withRetry(() =>
        db
          .select({
            userId: examSessions.userId,
            examCount: sql<number>`count(*)::int`,
            masterySum: sql<number>`coalesce(sum(${examSessions.mastery}), 0)`,
          })
          .from(examSessions)
          .groupBy(examSessions.userId),
      ),
      // 明细用于逐人算 streak（量随签到天数线性，个人项目可接受）
      withRetry(() =>
        db
          .select({ userId: checkIns.userId, dateKey: checkIns.dateKey })
          .from(checkIns)
          .orderBy(desc(checkIns.dateKey)),
      ),
    ]);

    const answeredMap = new Map(progressRows.map((r) => [r.userId, r.answered]));
    const examMap = new Map(examRows.map((r) => [r.userId, r]));
    const checkinDaysMap = new Map<string, number>();
    const checkinKeysMap = new Map<string, string[]>();
    for (const row of checkinRows) {
      checkinDaysMap.set(row.userId, (checkinDaysMap.get(row.userId) ?? 0) + 1);
      const keys = checkinKeysMap.get(row.userId) ?? [];
      keys.push(row.dateKey);
      checkinKeysMap.set(row.userId, keys);
    }

    const entries = accounts.map((account) => {
      const userId = account.id;
      const answered = answeredMap.get(userId) ?? 0;
      const exam = examMap.get(userId);
      const examCount = exam?.examCount ?? 0;
      const examPoints = Math.round(
        (exam?.masterySum ?? 0) * POINTS.examFactor,
      );
      const checkinDays = checkinDaysMap.get(userId) ?? 0;
      const streak = getStreak(checkinKeysMap.get(userId) ?? []).current;
      const points =
        answered * POINTS.perAnswer +
        examPoints +
        checkinDays * POINTS.perCheckinDay +
        streak * POINTS.perStreakDay;

      return {
        userId,
        // 公开位只给昵称，绝不回退到登录用户名
        displayName: displayNameOf(account),
        points,
        answered,
        examCount,
        checkinDays,
        streak,
        isCurrentUser: currentUserId === userId,
      } satisfies Omit<LeaderboardEntry, "rank">;
    });

    entries.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.answered !== a.answered) return b.answered - a.answered;
      return a.displayName.localeCompare(b.displayName, "zh-Hans-CN");
    });

    return entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  } catch (err) {
    console.warn("[leaderboard] getLeaderboard failed:", err);
    return [];
  }
}
