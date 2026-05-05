import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { moneyRecurrentTemplate } from "@/db/schema/money";
import { badRequest, notFound, requireMoneyContext } from "@/lib/api-money";
import { recurrentCreateSchema } from "@/lib/validators/money";

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

  const parsed = recurrentCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const raw = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );

  const updates: Record<string, unknown> = { ...raw };
  if (parsed.data.nextRunAt) {
    updates.nextRunAt = new Date(parsed.data.nextRunAt);
  }

  if (Object.keys(updates).length === 0) {
    return badRequest("No updates");
  }

  const [updated] = await db
    .update(moneyRecurrentTemplate)
    .set(updates as typeof moneyRecurrentTemplate.$inferInsert)
    .where(
      and(
        eq(moneyRecurrentTemplate.id, id),
        eq(moneyRecurrentTemplate.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();

  if (!updated) return notFound();

  return NextResponse.json({
    data: {
      ...updated,
      nextRunAt: updated.nextRunAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;

  const deleted = await db
    .delete(moneyRecurrentTemplate)
    .where(
      and(
        eq(moneyRecurrentTemplate.id, id),
        eq(moneyRecurrentTemplate.workspaceId, ctx.workspaceId),
      ),
    )
    .returning({ id: moneyRecurrentTemplate.id });

  if (!deleted.length) return notFound();

  return NextResponse.json({ data: { ok: true } });
}
