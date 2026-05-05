import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { moneyBudget, moneyCategory } from "@/db/schema/money";
import { badRequest, notFound, requireMoneyContext } from "@/lib/api-money";
import { budgetCreateSchema } from "@/lib/validators/money";

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

  const parsed = budgetCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const updates = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  ) as Record<string, unknown>;

  if (parsed.data.periodStart) updates.periodStart = new Date(parsed.data.periodStart);
  if (parsed.data.periodEnd) updates.periodEnd = new Date(parsed.data.periodEnd);

  if (Object.keys(updates).length === 0) {
    return badRequest("No updates");
  }

  if (parsed.data.categoryId) {
    const cat = await db
      .select({ id: moneyCategory.id })
      .from(moneyCategory)
      .where(
        and(
          eq(moneyCategory.id, parsed.data.categoryId),
          eq(moneyCategory.workspaceId, ctx.workspaceId),
        ),
      )
      .limit(1);
    if (!cat.length) return badRequest("Invalid category");
  }

  const [updated] = await db
    .update(moneyBudget)
    .set(updates as Record<string, never>)
    .where(
      and(
        eq(moneyBudget.id, id),
        eq(moneyBudget.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();

  if (!updated) return notFound();

  return NextResponse.json({
    data: {
      ...updated,
      periodStart: updated.periodStart.toISOString(),
      periodEnd: updated.periodEnd.toISOString(),
      createdAt: updated.createdAt.toISOString(),
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;

  const deleted = await db
    .delete(moneyBudget)
    .where(
      and(eq(moneyBudget.id, id), eq(moneyBudget.workspaceId, ctx.workspaceId)),
    )
    .returning({ id: moneyBudget.id });

  if (!deleted.length) return notFound();

  return NextResponse.json({ data: { ok: true } });
}
