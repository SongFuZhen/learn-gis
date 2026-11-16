import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityDaily, checkIns, lessonViews } from "@/db/schema";
import { withRetry } from "@/lib/db-retry";
import { dateKey } from "@/lib/quiz/exam";

/** 单日活动量 + 当天是否打卡（日历格子的完整输入） */
export type ActivityDay = {
  dateKey: string;
  answerCount: number;
  examCount: number;
  lessonCount: number;
  checkedIn: boolean;
};

type BumpKind = {
  answers?: number;
  exams?: number;
  lessons?: number;
};

/**
 * 累加当天活动量：upsert，冲突时用 SQL 字段自增，避免读改写竞态。
 * 活动统计是业务副效果，异常只告警，不影响答题主流程。
 */
export async function bumpDailyActivity(
  userId: string,
  bump: BumpKind,
): Promise<void> {
  const answers = bump.answers ?? 0;
  const exams = bump.exams ?? 0;
  const lessons = bump.lessons ?? 0;
  if (answers + exams + lessons <= 0) return;

  try {
    await withRetry(() =>
      db
        .insert(activityDaily)
        .values({
          userId,
          dateKey: dateKey(),
          answerCount: answers,
          examCount: exams,
          lessonCount: lessons,
        })
        .onConflictDoUpdate({
          target: [activityDaily.userId, activityDaily.dateKey],
          set: {
            answerCount: sql`${activityDaily.answerCount} + ${answers}`,
            examCount: sql`${activityDaily.examCount} + ${exams}`,
            lessonCount: sql`${activityDaily.lessonCount} + ${lessons}`,
            updatedAt: new Date(),
          },
        }),
    );
  } catch (err) {
    console.warn("[activity] bumpDailyActivity failed:", err);
  }
}

/**
 * 记录讲义阅读：同人同天同章唯一，冲突即今天已读过，不重复计数。
 * 调用方需先 resolveUserId 拿到既有身份；纯浏览不铸造匿名用户行。
 */
export async function recordLessonView(
  userId: string,
  skill: string,
  moduleSlug: string,
): Promise<void> {
  try {
    const result = await withRetry(() =>
      db
        .insert(lessonViews)
        .values({ userId, dateKey: dateKey(), skill, moduleSlug })
        .onConflictDoNothing({
          target: [
            lessonViews.userId,
            lessonViews.dateKey,
            lessonViews.skill,
            lessonViews.moduleSlug,
          ],
        }),
    );
    if ((result.rowCount ?? 0) > 0) {
      await bumpDailyActivity(userId, { lessons: 1 });
    }
  } catch (err) {
    console.warn("[activity] recordLessonView failed:", err);
  }
}

/**
 * 纯函数：日历色阶 0-4。
 * 未打卡 → 0（空底）；打卡但零活动 → 1；
 * 加权分 answer + exam*5 + lesson*3：1-4→1，5-14→2，15-34→3，≥35→4。
 */
export function activityLevel(day: Pick<
  ActivityDay,
  "checkedIn" | "answerCount" | "examCount" | "lessonCount"
>): 0 | 1 | 2 | 3 | 4 {
  if (!day.checkedIn) return 0;
  const score =
    day.answerCount + day.examCount * 5 + day.lessonCount * 3;
  if (score >= 35) return 4;
  if (score >= 15) return 3;
  if (score >= 5) return 2;
  return 1;
}

/** 某月日历数据：活动行 + 打卡行合并为稀疏数组（无数据的天由 UI 补空底格子） */
export async function getActivityCalendar(
  userId: string,
  yearMonth: string,
): Promise<ActivityDay[]> {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return [];
  const lastDay = new Date(year, month, 0).getDate();
  const from = `${yearMonth}-01`;
  const to = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;

  try {
    const [activityRows, checkinRows] = await withRetry(() =>
      Promise.all([
        db
          .select()
          .from(activityDaily)
          .where(
            and(
              eq(activityDaily.userId, userId),
              gte(activityDaily.dateKey, from),
              lte(activityDaily.dateKey, to),
            ),
          ),
        db
          .select({ dateKey: checkIns.dateKey })
          .from(checkIns)
          .where(
            and(
              eq(checkIns.userId, userId),
              gte(checkIns.dateKey, from),
              lte(checkIns.dateKey, to),
            ),
          ),
      ]),
    );

    const byDay = new Map<string, ActivityDay>();
    for (const row of activityRows) {
      byDay.set(row.dateKey, {
        dateKey: row.dateKey,
        answerCount: row.answerCount,
        examCount: row.examCount,
        lessonCount: row.lessonCount,
        checkedIn: false,
      });
    }
    for (const row of checkinRows) {
      const existing = byDay.get(row.dateKey);
      if (existing) {
        existing.checkedIn = true;
      } else {
        // 打卡存在但活动为 0 的天也要亮色阶 1
        byDay.set(row.dateKey, {
          dateKey: row.dateKey,
          answerCount: 0,
          examCount: 0,
          lessonCount: 0,
          checkedIn: true,
        });
      }
    }
    return [...byDay.values()].sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey),
    );
  } catch (err) {
    console.warn("[activity] getActivityCalendar failed:", err);
    return [];
  }
}
