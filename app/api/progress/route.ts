import { NextResponse } from "next/server";
import { and, asc, desc, eq, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { examSessions, moduleProgress, wrongAnswers } from "@/db/schema";
import { getOrCreateUserId } from "@/lib/api/user";
import { INITIAL_CARD, schedule, type CardState } from "@/lib/quiz/schedule";
import { withRetry } from "@/lib/db-retry";

export const dynamic = "force-dynamic";

const REVIEW_QUEUE_LIMIT = 20;

/** 累计一次答题（存在则 +1，否则创建）；skipped=true 时同时累计跳过数 */
async function bumpModuleProgress(
  userId: string,
  skill: string,
  moduleSlug: string,
  correct: boolean,
  skipped: boolean,
) {
  const [current] = await db
    .select()
    .from(moduleProgress)
    .where(
      and(
        eq(moduleProgress.userId, userId),
        eq(moduleProgress.skill, skill),
        eq(moduleProgress.moduleSlug, moduleSlug),
      ),
    );

  if (!current) {
    await db.insert(moduleProgress).values({
      userId,
      skill,
      moduleSlug,
      totalAttempts: 1,
      wrongCount: correct ? 0 : 1,
      skippedCount: skipped ? 1 : 0,
      lastAttemptAt: new Date(),
    });
    return;
  }

  await db
    .update(moduleProgress)
    .set({
      totalAttempts: current.totalAttempts + 1,
      wrongCount: current.wrongCount + (correct ? 0 : 1),
      skippedCount: current.skippedCount + (skipped ? 1 : 0),
      lastAttemptAt: new Date(),
    })
    .where(eq(moduleProgress.id, current.id));
}

export async function GET() {
  const userId = await getOrCreateUserId();

  const [progress, wrongQueue, exams] = await withRetry(() =>
    Promise.all([
      db
        .select()
        .from(moduleProgress)
        .where(eq(moduleProgress.userId, userId)),
      db
        .select()
        .from(wrongAnswers)
        .where(
          and(
            eq(wrongAnswers.userId, userId),
            isNull(wrongAnswers.clearedAt),
            or(isNull(wrongAnswers.dueAt), lte(wrongAnswers.dueAt, new Date())),
          ),
        )
        .orderBy(asc(wrongAnswers.dueAt))
        .limit(REVIEW_QUEUE_LIMIT),
      db
        .select()
        .from(examSessions)
        .where(eq(examSessions.userId, userId))
        .orderBy(desc(examSessions.createdAt))
        .limit(10),
    ]),
  );

  return NextResponse.json({ progress, wrongQueue, exams });
}

/** 请求体校验：所有字段都要过 zod，避免 NaN / 伪造 */
const submitAnswerSchema = z.object({
  type: z.literal("submit-answer"),
  skill: z.string().min(1).default("gis"),
  moduleSlug: z.string().min(1),
  questionId: z.string().min(1),
  isCorrect: z.boolean(),
  /** 主动跳过：服务端强制按答错处理 */
  skipped: z.boolean().optional().default(false),
});

const examCompleteSchema = z
  .object({
    type: z.literal("exam-complete"),
    mode: z.enum(["daily", "mock"]),
    correct: z.number().int().min(0),
    total: z.number().int().min(1),
    skipped: z.number().int().min(0).optional().default(0),
    moduleSlug: z.string().optional(),
    dateKey: z.string().optional(),
  })
  .refine((b) => b.correct + b.skipped <= b.total, {
    message: "correct + skipped 不能大于 total",
    path: ["correct"],
  })
  .superRefine((b, ctx) => {
    if (b.mode === "daily" && (!b.dateKey || b.dateKey.length < 1)) {
      ctx.addIssue({
        code: "custom",
        message: "daily 模式需要 dateKey",
        path: ["dateKey"],
      });
    }
  });

const moduleQuizCompleteSchema = z
  .object({
    type: z.literal("module-quiz-complete"),
    skill: z.string().min(1).default("gis"),
    moduleSlug: z.string().min(1),
    correct: z.number().int().min(0),
    total: z.number().int().min(1),
    skipped: z.number().int().min(0).optional().default(0),
  })
  .refine((b) => b.correct + b.skipped <= b.total, {
    message: "correct + skipped 不能大于 total",
    path: ["correct"],
  });

const reviewAnswerSchema = z.object({
  type: z.literal("review-answer"),
  questionId: z.string().min(1),
  isCorrect: z.boolean(),
  /** 复习时主动跳过：按答错推进 SM-2（lapse+1，明天到期） */
  skipped: z.boolean().optional().default(false),
});

const bodySchema = z.discriminatedUnion("type", [
  submitAnswerSchema,
  examCompleteSchema,
  moduleQuizCompleteSchema,
  reviewAnswerSchema,
]);

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad request", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const userId = await getOrCreateUserId();

  if (body.type === "submit-answer") {
    const { skill, moduleSlug, questionId, skipped } = body;
    // 跳过 = 不会：服务端强制按答错处理，不信任客户端传来的 isCorrect
    const isCorrect = skipped ? false : body.isCorrect;

    // 同一题做错多次只保留一条未消除记录：冲突时刷新时间并重新计入复习队列
    if (!isCorrect) {
      await db
        .insert(wrongAnswers)
        .values({ userId, questionId, moduleSlug })
        .onConflictDoUpdate({
          target: [wrongAnswers.userId, wrongAnswers.questionId],
          set: { wrongAt: new Date(), clearedAt: null },
        });
    }
    await bumpModuleProgress(userId, skill, moduleSlug, isCorrect, skipped);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "exam-complete") {
    const { mode, correct, total, skipped, dateKey } = body;
    // 跳过题不参与得分率分母：mastery 只按实际作答题计算
    const graded = total - skipped;
    const mastery = graded === 0 ? 0 : (correct / graded) * 100;

    // 每日一卷：同一天（dateKey）只保留最新一次，防止客户端刷多条
    await db
      .insert(examSessions)
      .values({
        userId,
        mode,
        size: total,
        correct,
        skipped,
        mastery,
        dateKey: mode === "daily" ? dateKey! : null,
      })
      .onConflictDoUpdate({
        target: [examSessions.userId, examSessions.dateKey],
        set: {
          size: total,
          correct,
          skipped,
          mastery,
          createdAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true, mastery });
  }

  if (body.type === "review-answer") {
    const { questionId, skipped } = body;
    // 跳过按答错推进：lapse+1、明天到期、不会毕业
    const isCorrect = skipped ? false : body.isCorrect;
    const [row] = await db
      .select()
      .from(wrongAnswers)
      .where(
        and(
          eq(wrongAnswers.userId, userId),
          eq(wrongAnswers.questionId, questionId),
        ),
      )
      .limit(1);

    const prev: CardState = row
      ? { ease: row.ease, intervalDays: row.intervalDays, reps: row.reps, lapses: row.lapses }
      : INITIAL_CARD;
    const next = schedule(prev, isCorrect);
    const dueAt = new Date(Date.now() + next.dueInDays * 24 * 60 * 60 * 1000);
    // 连续答对 3 次（reps>=3）视为毕业，移出队列
    const graduated = isCorrect && next.reps >= 3;

    await db
      .update(wrongAnswers)
      .set({
        ease: next.ease,
        intervalDays: next.intervalDays,
        reps: next.reps,
        lapses: next.lapses,
        dueAt,
        clearedAt: graduated ? new Date() : null,
      })
      .where(
        and(
          eq(wrongAnswers.userId, userId),
          eq(wrongAnswers.questionId, questionId),
        ),
      );

    return NextResponse.json({ ok: true, dueInDays: next.dueInDays, graduated });
  }

  // module-quiz-complete
  const { skill, moduleSlug, correct, total, skipped } = body;
  const graded = total - skipped;
  const mastery = graded === 0 ? 0 : (correct / graded) * 100;

  // 章节掌握度滚动平均：mastery 按章节测验次数平均
  const [current] = await db
    .select()
    .from(moduleProgress)
    .where(
      and(
        eq(moduleProgress.userId, userId),
        eq(moduleProgress.skill, skill),
        eq(moduleProgress.moduleSlug, moduleSlug),
      ),
    );
  if (current) {
    const quizzes = current.quizCount;
    const nextMastery = (current.mastery * quizzes + mastery) / (quizzes + 1);
    await db
      .update(moduleProgress)
      .set({
        mastery: nextMastery,
        quizCount: quizzes + 1,
        lastAttemptAt: new Date(),
      })
      .where(eq(moduleProgress.id, current.id));
  } else {
    await db.insert(moduleProgress).values({
      userId,
      skill,
      moduleSlug,
      mastery,
      quizCount: 1,
      lastAttemptAt: new Date(),
    });
  }

  return NextResponse.json({ ok: true, mastery });
}
