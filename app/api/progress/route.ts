import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { examSessions, moduleProgress, users, wrongAnswers } from "@/db/schema";

export const dynamic = "force-dynamic";

const REVIEW_QUEUE_LIMIT = 20;

/** 从 cookie 取访客用户，没有就创建并写 cookie */
async function getOrCreateUserId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get("user_id")?.value;
  if (existing) {
    await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, existing));
    return existing;
  }
  const [created] = await db
    .insert(users)
    .values({})
    .returning({ id: users.id });
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

  const [progress, wrongQueue, exams] = await Promise.all([
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
        ),
      )
      .orderBy(desc(wrongAnswers.wrongAt))
      .limit(REVIEW_QUEUE_LIMIT),
    db
      .select()
      .from(examSessions)
      .where(eq(examSessions.userId, userId))
      .orderBy(desc(examSessions.createdAt))
      .limit(10),
  ]);

  return NextResponse.json({ progress, wrongQueue, exams });
}

type SubmitAnswerBody = {
  type: "submit-answer";
  moduleSlug: string;
  questionId: string;
  isCorrect: boolean;
};

type ExamCompleteBody = {
  type: "exam-complete";
  mode: "daily" | "mock";
  correct: number;
  total: number;
  moduleSlug?: string;
  dateKey?: string;
};

type ModuleQuizCompleteBody = {
  type: "module-quiz-complete";
  moduleSlug: string;
  correct: number;
  total: number;
};

type Body = SubmitAnswerBody | ExamCompleteBody | ModuleQuizCompleteBody;

export async function POST(request: Request) {
  const userId = await getOrCreateUserId();
  const body = (await request.json()) as Body;

  if (body.type === "submit-answer") {
    const { moduleSlug, questionId, isCorrect } = body;
    if (!moduleSlug || !questionId) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }

    if (!isCorrect) {
      await db.insert(wrongAnswers).values({
        userId,
        questionId,
        moduleSlug,
      });
    }
    await bumpModuleProgress(userId, moduleSlug, isCorrect);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "exam-complete") {
    const { mode, correct, total, dateKey } = body;
    if (!mode || total <= 0) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    const mastery = (correct / total) * 100;

    await db.insert(examSessions).values({
      userId,
      mode,
      size: total,
      correct,
      mastery,
      dateKey: mode === "daily" ? dateKey : null,
    });

    return NextResponse.json({ ok: true, mastery });
  }

  if (body.type === "module-quiz-complete") {
    const { moduleSlug, correct, total } = body;
    if (!moduleSlug || total <= 0) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
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
      const nextMastery =
        (current.mastery * quizzes + mastery) / (quizzes + 1);
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

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
