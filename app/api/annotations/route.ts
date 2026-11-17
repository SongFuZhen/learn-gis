import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { annotations } from "@/db/schema";
import { getOrCreateUserId } from "@/lib/api/user";
import { withRetry } from "@/lib/db-retry";

export const dynamic = "force-dynamic";

const querySchema = z
  .object({
    skill: z.string().min(1).optional(),
    module: z.string().min(1).optional(),
    summary: z.literal("true").optional(),
  })
  .refine((q) => q.module === undefined || q.skill !== undefined, {
    message: "提供 module 时必须同时提供 skill",
  })
  .refine((q) => !q.summary || q.module === undefined, {
    message: "summary 模式不支持 module 查询",
  });

const anchorSchema = z.object({
  start: z.number().int().min(0),
  end: z.number().int().min(1),
  prefix: z.string(),
  suffix: z.string(),
});

const createSchema = z
  .object({
    skill: z.string().min(1).default("gis"),
    moduleSlug: z.string().min(1),
    kind: z.enum(["note", "record", "question"]),
    quote: z.string().min(1).max(2000),
    anchor: anchorSchema,
    note: z.string().max(4000).default(""),
  })
  .refine((b) => b.anchor.end > b.anchor.start, {
    message: "anchor.end 必须大于 start",
    path: ["anchor"],
  });

/** 本章全部标注（按创建时间升序，保证渲染顺序稳定） */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    skill: url.searchParams.get("skill") ?? undefined,
    module: url.searchParams.get("module") ?? undefined,
    summary: url.searchParams.get("summary") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const userId = await getOrCreateUserId();
  const { skill, module: moduleSlug, summary } = parsed.data;
  const scope = skill ? [eq(annotations.skill, skill)] : [];
  if (moduleSlug) scope.push(eq(annotations.moduleSlug, moduleSlug));

  const rows = await withRetry(() =>
    db
      .select()
      .from(annotations)
      .where(and(eq(annotations.userId, userId), ...scope))
      .orderBy(asc(annotations.createdAt), asc(annotations.id)),
  );

  if (summary) {
    const bySkill = new Map<
      string,
      {
        skill: string;
        moduleCount: number;
        total: number;
        counts: Record<"note" | "record" | "question", number>;
        modules: Set<string>;
      }
    >();
    for (const row of rows) {
      const current =
        bySkill.get(row.skill) ??
        {
          skill: row.skill,
          moduleCount: 0,
          total: 0,
          counts: { note: 0, record: 0, question: 0 },
          modules: new Set<string>(),
        };
      current.total += 1;
      current.counts[row.kind] += 1;
      current.modules.add(row.moduleSlug);
      current.moduleCount = current.modules.size;
      bySkill.set(row.skill, current);
    }
    return NextResponse.json({
      summary: Array.from(bySkill.values()).map((item) => ({
        skill: item.skill,
        moduleCount: item.moduleCount,
        total: item.total,
        counts: item.counts,
      })),
    });
  }

  return NextResponse.json({ annotations: rows });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad request", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const body = parsed.data;
  const userId = await getOrCreateUserId();

  const [row] = await withRetry(() =>
    db
      .insert(annotations)
      .values({
        userId,
        skill: body.skill,
        moduleSlug: body.moduleSlug,
        kind: body.kind,
        quote: body.quote,
        anchor: body.anchor,
        note: body.note,
      })
      .returning(),
  );

  return NextResponse.json({ annotation: row }, { status: 201 });
}
