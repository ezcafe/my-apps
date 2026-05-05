import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { moneyRule } from "@/db/schema/money";
import { badRequest, notFound, requireMoneyContext } from "@/lib/api-money";
import { ruleCreateSchema } from "@/lib/validators/money";

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

  const parsed = ruleCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const updates = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );

  if (Object.keys(updates).length === 0) {
    return badRequest("No updates");
  }

  const [updated] = await db
    .update(moneyRule)
    .set(updates)
    .where(
      and(eq(moneyRule.id, id), eq(moneyRule.workspaceId, ctx.workspaceId)),
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

  const deleted = await db
    .delete(moneyRule)
    .where(
      and(eq(moneyRule.id, id), eq(moneyRule.workspaceId, ctx.workspaceId)),
    )
    .returning({ id: moneyRule.id });

  if (!deleted.length) return notFound();

  return NextResponse.json({ data: { ok: true } });
}
