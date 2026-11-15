import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { checkIns } from "@/db/schema";
import { withRetry } from "@/lib/db-retry";
import { dateKey } from "@/lib/quiz/exam";

export type Streak = {
  /** 当前连续签到天数（今天没签时从昨天往前数，不断签） */
  current: number;
  /** 历史最长连续天数 */
  longest: number;
};

/** 把 YYYY-MM-DD 解析成本地时区的零点 Date（避免 new Date(str) 的 UTC 偏移） */
function parseDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

function addDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

/**
 * 纯函数：由签到日期集合计算连续天数。
 * current：今天已签从今天起算，没签从昨天起算（当天尚未学习不算断签）；
 * 中间缺一天即断。longest：全集合扫出的最长连续段。
 */
export function getStreak(dateKeys: string[]): Streak {
  if (dateKeys.length === 0) return { current: 0, longest: 0 };

  const days = [...new Set(dateKeys)]
    .map(parseDay)
    .sort((a, b) => a.getTime() - b.getTime());

  // longest：有序扫描连续段
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    const diff = Math.round(
      (days[i]!.getTime() - days[i - 1]!.getTime()) / 86_400_000,
    );
    run = diff === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // current：锚定今天/昨天反向数
  const today = parseDay(dateKey());
  const keySet = new Set(dateKeys);
  let cursor = keySet.has(dateKey(today)) ? today : addDays(today, -1);
  let current = 0;
  while (keySet.has(dateKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, longest };
}

/**
 * 当天首次学习时调用：插入今日签到行，唯一约束冲突表示已签。
 * 签到是业务副效果，任何 DB 异常都吞掉（只告警），不影响答题主流程。
 */
export async function ensureCheckin(
  userId: string,
): Promise<{ isNewToday: boolean }> {
  const today = dateKey();
  try {
    const result = await withRetry(() =>
      db
        .insert(checkIns)
        .values({ userId, dateKey: today })
        .onConflictDoNothing({
          target: [checkIns.userId, checkIns.dateKey],
        }),
    );
    return { isNewToday: (result.rowCount ?? 0) > 0 };
  } catch (err) {
    console.warn("[checkin] ensureCheckin failed:", err);
    return { isNewToday: false };
  }
}

export type CheckinSummary = Streak & {
  /** 今天是否已签到 */
  checkedToday: boolean;
  /** 累计签到天数 */
  totalDays: number;
};

/** 个人签到摘要，DB 异常时回落全零（页面不可因此 500） */
export async function getCheckinSummary(userId: string): Promise<CheckinSummary> {
  try {
    const rows = await withRetry(() =>
      db
        .select({ dateKey: checkIns.dateKey })
        .from(checkIns)
        .where(eq(checkIns.userId, userId))
        .orderBy(desc(checkIns.dateKey)),
    );
    const keys = rows.map((r) => r.dateKey);
    return {
      ...getStreak(keys),
      checkedToday: keys.includes(dateKey()),
      totalDays: keys.length,
    };
  } catch (err) {
    console.warn("[checkin] getCheckinSummary failed:", err);
    return { current: 0, longest: 0, checkedToday: false, totalDays: 0 };
  }
}
