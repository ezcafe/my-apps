import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { moneyCategory } from "@/db/schema/money";
import { badRequest, notFound, requireMoneyContext } from "@/lib/api-money";
import { assertValidCategoryParent } from "@/lib/money-category-parent";
import { categoryCreateSchema } from "@/lib/validators/money";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = categoryCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  if (parsed.data.parentId) {
    const err = await assertValidCategoryParent(
      ctx.workspaceId,
      parsed.data.parentId,
      id,
    );
    if (err) return badRequest(err);
  }

  const updates = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );

  if (Object.keys(updates).length === 0) {
    return badRequest("No updates");
  }

  const [updated] = await db
    .update(moneyCategory)
    .set(updates)
    .where(
      and(
        eq(moneyCategory.id, id),
        eq(moneyCategory.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();

  if (!updated) return notFound();

  return NextResponse.json({
    data: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;

  const [updated] = await db
    .update(moneyCategory)
    .set({ archived: true })
    .where(
      and(
        eq(moneyCategory.id, id),
        eq(moneyCategory.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();

  if (!updated) return notFound();

  return NextResponse.json({ data: { ok: true } });
}
