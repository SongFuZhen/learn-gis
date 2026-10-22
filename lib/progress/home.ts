import { cookies } from "next/headers";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { examSessions, moduleProgress, wrongAnswers } from "@/db/schema";
import { GIS_MODULES } from "@/content/gis/modules";
import { dateKey } from "@/lib/quiz/exam";

export type ChapterProgress = {
  slug: string;
  title: string;
  /** 0~100，未测验为 0 */
  mastery: number;
  quizCount: number;
};

export type HomeData = {
  /** 已答题总数（章节测验 + 考试累计） */
  answeredTotal: number;
  /** 已测验章节的平均掌握度；没有任何测验时为 null */
  avgMastery: number | null;
  examCount: number;
  /** 最近一次考试（每日/综合）的得分率 */
  lastExamMastery: number | null;
  /** 今日一考今天是否已交卷 */
  dailyDoneToday: boolean;
  /** 复习队列中待复习题数 */
  reviewDue: number;
  /** 最近学习的章节 slug（用于「继续学习」）；从未学过为 null */
  continueSlug: string | null;
  chapters: ChapterProgress[];
};

/**
 * 首页个性化数据。无 cookie（纯新访客）或 DB 不可用时返回 null，
 * 页面回落到静态介绍版 —— 首页任何时候都不能 500。
 */
export async function getHomeData(): Promise<HomeData | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) return null;

  try {
    const today = dateKey();
    const [progressRows, reviewAgg, examAgg, lastExamRows, dailyRows] =
      await Promise.all([
        db
          .select()
          .from(moduleProgress)
          .where(eq(moduleProgress.userId, userId)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(wrongAnswers)
          .where(
            and(
              eq(wrongAnswers.userId, userId),
              isNull(wrongAnswers.clearedAt),
            ),
          ),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(examSessions)
          .where(eq(examSessions.userId, userId)),
        db
          .select({ mastery: examSessions.mastery })
          .from(examSessions)
          .where(eq(examSessions.userId, userId))
          .orderBy(desc(examSessions.createdAt))
          .limit(1),
        db
          .select({ id: examSessions.id })
          .from(examSessions)
          .where(
            and(
              eq(examSessions.userId, userId),
              eq(examSessions.mode, "daily"),
              eq(examSessions.dateKey, today),
            ),
          )
          .limit(1),
      ]);

    const bySlug = new Map(progressRows.map((r) => [r.moduleSlug, r]));
    const chapters: ChapterProgress[] = GIS_MODULES.map((m) => {
      const row = bySlug.get(m.slug);
      return {
        slug: m.slug,
        title: m.title,
        mastery: row?.mastery ?? 0,
        quizCount: row?.quizCount ?? 0,
      };
    });

    const answeredTotal = progressRows.reduce(
      (sum, r) => sum + r.totalAttempts,
      0,
    );
    const quizzed = progressRows.filter((r) => r.quizCount > 0);
    const avgMastery =
      quizzed.length > 0
        ? quizzed.reduce((sum, r) => sum + r.mastery, 0) / quizzed.length
        : null;

    const latest = progressRows
      .filter((r) => r.lastAttemptAt !== null)
      .sort(
        (a, b) =>
          (b.lastAttemptAt?.getTime() ?? 0) - (a.lastAttemptAt?.getTime() ?? 0),
      )[0];

    return {
      answeredTotal,
      avgMastery,
      examCount: examAgg[0]?.count ?? 0,
      lastExamMastery: lastExamRows[0]?.mastery ?? null,
      dailyDoneToday: dailyRows.length > 0,
      reviewDue: reviewAgg[0]?.count ?? 0,
      continueSlug: latest?.moduleSlug ?? null,
      chapters,
    };
  } catch {
    // DB 不可用（未配 DATABASE_URL / 网络抖动）：回落静态版
    return null;
  }
}
