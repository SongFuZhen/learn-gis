import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { annotations } from "@/db/schema";
import { getOrCreateUserId } from "@/lib/api/user";
import { withRetry } from "@/lib/db-retry";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  skill: z.string().min(1).default("gis"),
  module: z.string().min(1),
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
    module: url.searchParams.get("module"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const userId = await getOrCreateUserId();
  const { skill, module } = parsed.data;
  const rows = await withRetry(() =>
    db
      .select()
      .from(annotations)
      .where(
        and(
          eq(annotations.userId, userId),
          eq(annotations.skill, skill),
          eq(annotations.moduleSlug, module),
        ),
      )
      .orderBy(asc(annotations.createdAt), asc(annotations.id)),
  );

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
