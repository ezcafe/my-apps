import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { moneyTag } from "@/db/schema/money";
import { tagCreateSchema } from "@/lib/validators/money";
import type { MoneyWorkspaceCtx } from "@/lib/money-services/types";

export async function listMoneyTags(workspaceId: string) {
  const rows = await db
    .select()
    .from(moneyTag)
    .where(eq(moneyTag.workspaceId, workspaceId))
    .orderBy(asc(moneyTag.name));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createMoneyTag(ctx: MoneyWorkspaceCtx, body: unknown) {
  const parsed = tagCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const [created] = await db
    .insert(moneyTag)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      color: parsed.data.color ?? null,
    })
    .returning();

  return {
    ...created,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function updateMoneyTag(
  ctx: MoneyWorkspaceCtx,
  id: string,
  body: unknown,
) {
  const parsed = tagCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const updates = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );

  if (Object.keys(updates).length === 0) {
    throw new Error("No updates");
  }

  const [updated] = await db
    .update(moneyTag)
    .set(updates)
    .where(and(eq(moneyTag.id, id), eq(moneyTag.workspaceId, ctx.workspaceId)))
    .returning();

  if (!updated) throw new Error("NOT_FOUND");

  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function deleteMoneyTag(
  ctx: MoneyWorkspaceCtx,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(moneyTag)
    .where(and(eq(moneyTag.id, id), eq(moneyTag.workspaceId, ctx.workspaceId)))
    .returning({ id: moneyTag.id });

  return deleted.length > 0;
}
