import { and, asc, desc, eq, getTableColumns, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { moneyTag, moneyTransaction, moneyTransactionTag } from "@/db/schema/money";
import { tagCreateSchema } from "@/lib/validators/money";
import type { MoneyWorkspaceCtx } from "@/lib/money-services/types";

const USAGE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export async function listMoneyTags(workspaceId: string) {
  const since = new Date(Date.now() - USAGE_WINDOW_MS);
  const rows = await db
    .select({
      ...getTableColumns(moneyTag),
      usageCount: sql<number>`count(${moneyTransaction.id})::int`.as(
        "usage_count",
      ),
    })
    .from(moneyTag)
    .leftJoin(
      moneyTransactionTag,
      eq(moneyTransactionTag.tagId, moneyTag.id),
    )
    .leftJoin(
      moneyTransaction,
      and(
        eq(moneyTransaction.id, moneyTransactionTag.transactionId),
        eq(moneyTransaction.workspaceId, workspaceId),
        gte(moneyTransaction.occurredAt, since),
      ),
    )
    .where(eq(moneyTag.workspaceId, workspaceId))
    .groupBy(moneyTag.id)
    .orderBy(desc(sql`usage_count`), asc(moneyTag.name));

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
