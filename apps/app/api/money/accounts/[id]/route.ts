import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { moneyAccount } from "@/db/schema/money";
import { badRequest, notFound, requireMoneyContext } from "@/lib/api-money";
import { getWorkspaceDefaultCurrency } from "@/lib/workspace";
import { accountCreateSchema } from "@/lib/validators/money";

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

  const parsed = accountCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const updates = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );
  delete (updates as { currency?: string }).currency;

  const [updated] = await db
    .update(moneyAccount)
    .set(updates)
    .where(
      and(
        eq(moneyAccount.id, id),
        eq(moneyAccount.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();

  if (!updated) return notFound();
  const workspaceCurrency =
    (await getWorkspaceDefaultCurrency(ctx.workspaceId)) ?? "USD";

  return NextResponse.json({
    data: {
      ...updated,
      currency: workspaceCurrency,
      createdAt: updated.createdAt.toISOString(),
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;

  const [updated] = await db
    .update(moneyAccount)
    .set({ archived: true })
    .where(
      and(
        eq(moneyAccount.id, id),
        eq(moneyAccount.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();

  if (!updated) return notFound();

  return NextResponse.json({ data: { ok: true } });
}
