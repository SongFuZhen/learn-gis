import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { examSessions, moduleProgress, wrongAnswers } from "@/db/schema";
import { SKILL_REGISTRY } from "@/content/registry";
import { resolveUserId } from "@/lib/api/user";
import { dateKey } from "@/lib/quiz/exam";

export type ChapterProgress = {
  skill: string;
  slug: string;
  title: string;
  /** 0~100，未测验为 0 */
  mastery: number;
  quizCount: number;
};

export type RecentExam = {
  mode: "daily" | "mock";
  /** 得分率 0~100 */
  mastery: number;
  /** M/D 格式的短日期标签 */
  dayLabel: string;
};

export type HomeData = {
  /** 已答题总数（章节测验 + 考试累计） */
  answeredTotal: number;
  /** 已测验章节的平均掌握度；没有任何测验时为 null */
  avgMastery: number | null;
  examCount: number;
  /** 最近一次考试（每日/综合）的得分率 */
  lastExamMastery: number | null;
  /** 历史最好成绩 */
  bestExamMastery: number | null;
  /** 近 7 天考试次数 */
  examsLast7d: number;
  /** 最近 10 次考试（时间升序，供柱状图） */
  recentExams: RecentExam[];
  /** 今日一考今天是否已交卷 */
  dailyDoneToday: boolean;
  /** 复习队列中待复习题数 */
  reviewDue: number;
  /** 最近学习的章节 slug（用于「继续学习」）；从未学过为 null */
  continueSlug: string | null;
  /** 最近学习章节所属技能（与 continueSlug 配对） */
  continueSkill: string | null;
  chapters: ChapterProgress[];
};

/**
 * 首页个性化数据。无 cookie（纯新访客）或 DB 不可用时返回 null，
 * 页面回落到静态介绍版 —— 首页任何时候都不能 500。
 */
export async function getHomeData(): Promise<HomeData | null> {
  const userId = await resolveUserId();
  if (!userId) return null;

  try {
    const today = dateKey();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [progressRows, reviewAgg, examStatsRow, recentExamRows] =
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
        // 考试单表的总量/最好/近 7 天/今日每日一考，一次聚合算完
        db
          .select({
            total: sql<number>`count(*)::int`,
            best: sql<number | null>`max(${examSessions.mastery})`,
            weekCount: sql<number>`count(*) filter (where ${examSessions.createdAt} >= ${weekAgo})::int`,
            todayDaily: sql<number>`count(*) filter (where ${examSessions.mode} = 'daily' and ${examSessions.dateKey} = ${today})::int`,
          })
          .from(examSessions)
          .where(eq(examSessions.userId, userId)),
        db
          .select({
            mode: examSessions.mode,
            mastery: examSessions.mastery,
            createdAt: examSessions.createdAt,
          })
          .from(examSessions)
          .where(eq(examSessions.userId, userId))
          .orderBy(desc(examSessions.createdAt))
          .limit(10),
      ]);

    const examStats = examStatsRow[0];
    const lastExam = recentExamRows[0] ?? null;

    // skill:slug 复合键：cesium 的 "00" 与 gis 的 "00" 是不同章节
    const bySlug = new Map(
      progressRows.map((r) => [`${r.skill ?? "gis"}:${r.moduleSlug}`, r]),
    );
    const chapters: ChapterProgress[] = SKILL_REGISTRY.flatMap((reg) =>
      reg.modules.map((m) => {
        const row = bySlug.get(`${reg.id}:${m.slug}`);
        return {
          skill: reg.id,
          slug: m.slug,
          title: m.title,
          mastery: row?.mastery ?? 0,
          quizCount: row?.quizCount ?? 0,
        };
      }),
    );

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
      examCount: examStats?.total ?? 0,
      lastExamMastery: lastExam?.mastery ?? null,
      bestExamMastery: examStats?.best ?? null,
      examsLast7d: examStats?.weekCount ?? 0,
      recentExams: recentExamRows.reverse().map((r) => ({
        mode: r.mode,
        mastery: r.mastery,
        dayLabel: `${r.createdAt.getMonth() + 1}/${r.createdAt.getDate()}`,
      })),
      dailyDoneToday: (examStats?.todayDaily ?? 0) > 0,
      reviewDue: reviewAgg[0]?.count ?? 0,
      continueSlug: latest?.moduleSlug ?? null,
      continueSkill: latest?.skill ?? (latest ? "gis" : null),
      chapters,
    };
  } catch {
    // DB 不可用（未配 DATABASE_URL / 网络抖动）：回落静态版
    return null;
  }
}
