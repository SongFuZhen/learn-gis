import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { annotations } from "@/db/schema";
import { getOrCreateUserId } from "@/lib/api/user";
import { withRetry } from "@/lib/db-retry";

export const dynamic = "force-dynamic";

const uuidSchema = z.uuid();

const patchSchema = z
  .object({
    kind: z.enum(["note", "record", "question"]).optional(),
    note: z.string().max(4000).optional(),
  })
  .refine((b) => b.kind !== undefined || b.note !== undefined, {
    message: "至少要提供 kind 或 note 之一",
  });

type Ctx = { params: Promise<{ id: string }> };

/** 所有写操作都带 userId 条件，防止越权改/删他人标注 */
function ownedBy(id: string, userId: string) {
  return and(eq(annotations.id, id), eq(annotations.userId, userId));
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const userId = await getOrCreateUserId();
  const [row] = await withRetry(() =>
    db
      .update(annotations)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(ownedBy(id, userId))
      .returning(),
  );
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ annotation: row });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const userId = await getOrCreateUserId();
  const [row] = await withRetry(() =>
    db
      .delete(annotations)
      .where(ownedBy(id, userId))
      .returning({ id: annotations.id }),
  );
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
