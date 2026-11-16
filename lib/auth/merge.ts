/**
 * 跨设备登录时的匿名数据合并：把 anonId 名下四张业务表数据并入 accountId。
 * 必须在调用方的 db.transaction 内执行（传入同一 tx），保证原子性。
 */
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import {
  activityDaily,
  annotations,
  checkIns,
  examSessions,
  lessonViews,
  moduleProgress,
  users,
  wrongAnswers,
} from "@/db/schema";

/** 结构类型：db.transaction 回调里的 tx 与 db 同形，取所需方法即可 */
type Tx = typeof import("@/db").db;

export async function mergeAnonymousInto(
  tx: Tx,
  anonId: string,
  accountId: string,
): Promise<void> {
  if (anonId === accountId) return;

  // 1) 错题：同 (user, question) 账号已有记录则丢弃匿名重复行，其余改归属
  const anonWrongs = await tx
    .select({ id: wrongAnswers.id, questionId: wrongAnswers.questionId })
    .from(wrongAnswers)
    .where(eq(wrongAnswers.userId, anonId));
  if (anonWrongs.length > 0) {
    const accountWrongs = await tx
      .select({ questionId: wrongAnswers.questionId })
      .from(wrongAnswers)
      .where(eq(wrongAnswers.userId, accountId));
    const ownedQuestions = new Set(accountWrongs.map((r) => r.questionId));
    const duplicateIds = anonWrongs
      .filter((r) => ownedQuestions.has(r.questionId))
      .map((r) => r.id);
    if (duplicateIds.length > 0) {
      await tx.delete(wrongAnswers).where(inArray(wrongAnswers.id, duplicateIds));
    }
    await tx
      .update(wrongAnswers)
      .set({ userId: accountId })
      .where(eq(wrongAnswers.userId, anonId));
  }

  // 2) 章节进度：同 (skill, moduleSlug) 账号已有行则加权合并，否则改归属
  const anonProgress = await tx
    .select()
    .from(moduleProgress)
    .where(eq(moduleProgress.userId, anonId));
  for (const row of anonProgress) {
    const [existing] = await tx
      .select()
      .from(moduleProgress)
      .where(
        and(
          eq(moduleProgress.userId, accountId),
          eq(moduleProgress.skill, row.skill),
          eq(moduleProgress.moduleSlug, row.moduleSlug),
        ),
      )
      .limit(1);

    if (!existing) {
      await tx
        .update(moduleProgress)
        .set({ userId: accountId })
        .where(eq(moduleProgress.id, row.id));
      continue;
    }

    const totalQuiz = existing.quizCount + row.quizCount;
    const mergedMastery =
      totalQuiz > 0
        ? (existing.mastery * existing.quizCount +
            row.mastery * row.quizCount) /
          totalQuiz
        : existing.mastery;
    const lastAttemptAt =
      [existing.lastAttemptAt, row.lastAttemptAt]
        .filter((d): d is Date => d instanceof Date)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? existing.lastAttemptAt;

    await tx
      .update(moduleProgress)
      .set({
        mastery: mergedMastery,
        quizCount: totalQuiz,
        totalAttempts: existing.totalAttempts + row.totalAttempts,
        wrongCount: existing.wrongCount + row.wrongCount,
        skippedCount: existing.skippedCount + row.skippedCount,
        lastAttemptAt,
      })
      .where(eq(moduleProgress.id, existing.id));
    await tx.delete(moduleProgress).where(eq(moduleProgress.id, row.id));
  }

  // 3) 考试记录：每日卷有 (user, dateKey) 唯一约束，同 dateKey 先丢匿名重复行再改归属
  const anonExams = await tx
    .select({ id: examSessions.id, dateKey: examSessions.dateKey })
    .from(examSessions)
    .where(eq(examSessions.userId, anonId));
  const dailyKeys = anonExams
    .map((r) => r.dateKey)
    .filter((k): k is string => k !== null);
  if (dailyKeys.length > 0) {
    const ownedExams = await tx
      .select({ dateKey: examSessions.dateKey })
      .from(examSessions)
      .where(
        and(
          eq(examSessions.userId, accountId),
          isNotNull(examSessions.dateKey),
          inArray(examSessions.dateKey, dailyKeys),
        ),
      );
    const ownedKeys = new Set(
      ownedExams.map((r) => r.dateKey).filter((k): k is string => k !== null),
    );
    const dupExamIds = anonExams
      .filter((r) => r.dateKey !== null && ownedKeys.has(r.dateKey))
      .map((r) => r.id);
    if (dupExamIds.length > 0) {
      await tx.delete(examSessions).where(inArray(examSessions.id, dupExamIds));
    }
  }
  await tx
    .update(examSessions)
    .set({ userId: accountId })
    .where(eq(examSessions.userId, anonId));

  // 4) 签到：(user, dateKey) 唯一约束，同日期去重后改归属，否则连签记录会随匿名行级联丢失
  const anonCheckins = await tx
    .select({ id: checkIns.id, dateKey: checkIns.dateKey })
    .from(checkIns)
    .where(eq(checkIns.userId, anonId));
  if (anonCheckins.length > 0) {
    const ownedCheckins = await tx
      .select({ dateKey: checkIns.dateKey })
      .from(checkIns)
      .where(eq(checkIns.userId, accountId));
    const ownedDays = new Set(ownedCheckins.map((r) => r.dateKey));
    const dupCheckinIds = anonCheckins
      .filter((r) => ownedDays.has(r.dateKey))
      .map((r) => r.id);
    if (dupCheckinIds.length > 0) {
      await tx.delete(checkIns).where(inArray(checkIns.id, dupCheckinIds));
    }
    await tx
      .update(checkIns)
      .set({ userId: accountId })
      .where(eq(checkIns.userId, anonId));
  }

  // 5) 每日活动量：(user, dateKey) 唯一，同日期把匿名计数累加进账号行后删匿名行
  const anonActivities = await tx
    .select()
    .from(activityDaily)
    .where(eq(activityDaily.userId, anonId));
  for (const row of anonActivities) {
    const [owned] = await tx
      .select()
      .from(activityDaily)
      .where(
        and(
          eq(activityDaily.userId, accountId),
          eq(activityDaily.dateKey, row.dateKey),
        ),
      )
      .limit(1);
    if (owned) {
      await tx
        .update(activityDaily)
        .set({
          answerCount: owned.answerCount + row.answerCount,
          examCount: owned.examCount + row.examCount,
          lessonCount: owned.lessonCount + row.lessonCount,
          updatedAt: new Date(),
        })
        .where(eq(activityDaily.id, owned.id));
      await tx.delete(activityDaily).where(eq(activityDaily.id, row.id));
    } else {
      await tx
        .update(activityDaily)
        .set({ userId: accountId })
        .where(eq(activityDaily.id, row.id));
    }
  }

  // 6) 讲义阅读：(user, date, skill, module) 唯一，同键去重后改归属
  const anonViews = await tx
    .select({
      id: lessonViews.id,
      dateKey: lessonViews.dateKey,
      skill: lessonViews.skill,
      moduleSlug: lessonViews.moduleSlug,
    })
    .from(lessonViews)
    .where(eq(lessonViews.userId, anonId));
  if (anonViews.length > 0) {
    const ownedViews = await tx
      .select({
        dateKey: lessonViews.dateKey,
        skill: lessonViews.skill,
        moduleSlug: lessonViews.moduleSlug,
      })
      .from(lessonViews)
      .where(eq(lessonViews.userId, accountId));
    const ownedKeys = new Set(
      ownedViews.map((v) => `${v.dateKey}|${v.skill}|${v.moduleSlug}`),
    );
    const dupViewIds = anonViews
      .filter((v) =>
        ownedKeys.has(`${v.dateKey}|${v.skill}|${v.moduleSlug}`),
      )
      .map((v) => v.id);
    if (dupViewIds.length > 0) {
      await tx.delete(lessonViews).where(inArray(lessonViews.id, dupViewIds));
    }
    await tx
      .update(lessonViews)
      .set({ userId: accountId })
      .where(eq(lessonViews.userId, anonId));
  }

  // 7) 标注无唯一约束，直接改归属
  await tx
    .update(annotations)
    .set({ userId: accountId })
    .where(eq(annotations.userId, anonId));

  // 8) 匿名用户行删除（FK onDelete cascade 兜底）
  await tx.delete(users).where(eq(users.id, anonId));
}
