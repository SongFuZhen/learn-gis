import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, asc, desc, eq, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { examSessions, moduleProgress, users, wrongAnswers } from "@/db/schema";
import { INITIAL_CARD, schedule, type CardState } from "@/lib/quiz/schedule";
import { withRetry } from "@/lib/db-retry";

export const dynamic = "force-dynamic";

const REVIEW_QUEUE_LIMIT = 20;

/** 校验 cookie 里的 user_id 是否为合法 uuid（防止伪造串导致 pg 类型错误） */
const uuidSchema = z.uuid();

/**
 * 从 cookie 取访客用户：
 * - cookie 不存在、不是合法 uuid、或 db 里查无此人 → 新建并写 cookie；
 * - 否则只刷新 lastSeenAt 后复用，绝不直接信任客户端传入的 id 作为外键。
 */
async function getOrCreateUserId(): Promise<string> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("user_id")?.value;

  if (raw && uuidSchema.safeParse(raw).success) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, raw))
      .limit(1);
    if (existing) {
      await db
        .update(users)
        .set({ lastSeenAt: new Date() })
        .where(eq(users.id, existing.id));
      return existing.id;
    }
  }

  const [created] = await db.insert(users).values({}).returning({ id: users.id });
  if (!created) throw new Error("create user failed");
  cookieStore.set("user_id", created.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return created.id;
}

/** 累计一次答题（存在则 +1，否则创建） */
async function bumpModuleProgress(
  userId: string,
  moduleSlug: string,
  correct: boolean,
) {
  const [current] = await db
    .select()
    .from(moduleProgress)
    .where(
      and(
        eq(moduleProgress.userId, userId),
        eq(moduleProgress.moduleSlug, moduleSlug),
      ),
    );

  if (!current) {
    await db.insert(moduleProgress).values({
      userId,
      moduleSlug,
      totalAttempts: 1,
      wrongCount: correct ? 0 : 1,
      lastAttemptAt: new Date(),
    });
    return;
  }

  await db
    .update(moduleProgress)
    .set({
      totalAttempts: current.totalAttempts + 1,
      wrongCount: current.wrongCount + (correct ? 0 : 1),
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
  moduleSlug: z.string().min(1),
  questionId: z.string().min(1),
  isCorrect: z.boolean(),
});

const examCompleteSchema = z
  .object({
    type: z.literal("exam-complete"),
    mode: z.enum(["daily", "mock"]),
    correct: z.number().int().min(0),
    total: z.number().int().min(1),
    moduleSlug: z.string().optional(),
    dateKey: z.string().optional(),
  })
  .refine((b) => b.correct <= b.total, {
    message: "correct 不能大于 total",
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
    moduleSlug: z.string().min(1),
    correct: z.number().int().min(0),
    total: z.number().int().min(1),
  })
  .refine((b) => b.correct <= b.total, {
    message: "correct 不能大于 total",
    path: ["correct"],
  });

const reviewAnswerSchema = z.object({
  type: z.literal("review-answer"),
  questionId: z.string().min(1),
  isCorrect: z.boolean(),
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
    const { moduleSlug, questionId, isCorrect } = body;

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
    await bumpModuleProgress(userId, moduleSlug, isCorrect);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "exam-complete") {
    const { mode, correct, total, dateKey } = body;
    const mastery = (correct / total) * 100;

    // 每日一卷：同一天（dateKey）只保留最新一次，防止客户端刷多条
    await db
      .insert(examSessions)
      .values({
        userId,
        mode,
        size: total,
        correct,
        mastery,
        dateKey: mode === "daily" ? dateKey! : null,
      })
      .onConflictDoUpdate({
        target: [examSessions.userId, examSessions.dateKey],
        set: {
          size: total,
          correct,
          mastery,
          createdAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true, mastery });
  }

  if (body.type === "review-answer") {
    const { questionId, isCorrect } = body;
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
  const { moduleSlug, correct, total } = body;
  const mastery = (correct / total) * 100;

  // 章节掌握度滚动平均：mastery 按章节测验次数平均
  const [current] = await db
    .select()
    .from(moduleProgress)
    .where(
      and(
        eq(moduleProgress.userId, userId),
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
      moduleSlug,
      mastery,
      quizCount: 1,
      lastAttemptAt: new Date(),
    });
  }

  return NextResponse.json({ ok: true, mastery });
}
