import { and, asc, desc, eq, getTableColumns, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { moneyMerchant, moneyTransaction } from "@/db/schema/money";
import { merchantCreateSchema } from "@/lib/validators/money";
import type { MoneyWorkspaceCtx } from "@/lib/money-services/types";

const USAGE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export async function listMoneyMerchants(workspaceId: string) {
  const since = new Date(Date.now() - USAGE_WINDOW_MS);
  const rows = await db
    .select({
      ...getTableColumns(moneyMerchant),
      usageCount: sql<number>`count(${moneyTransaction.id})::int`.as(
        "usage_count",
      ),
    })
    .from(moneyMerchant)
    .leftJoin(
      moneyTransaction,
      and(
        eq(moneyTransaction.merchantId, moneyMerchant.id),
        eq(moneyTransaction.workspaceId, workspaceId),
        gte(moneyTransaction.occurredAt, since),
      ),
    )
    .where(eq(moneyMerchant.workspaceId, workspaceId))
    .groupBy(moneyMerchant.id)
    .orderBy(desc(sql`usage_count`), asc(moneyMerchant.name));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createMoneyMerchant(ctx: MoneyWorkspaceCtx, body: unknown) {
  const parsed = merchantCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const [created] = await db
    .insert(moneyMerchant)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      normalizedName:
        parsed.data.normalizedName ??
        parsed.data.name.toLowerCase().replace(/\s+/g, " ").trim(),
    })
    .returning();

  return {
    ...created,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function updateMoneyMerchant(
  ctx: MoneyWorkspaceCtx,
  id: string,
  body: unknown,
) {
  const parsed = merchantCreateSchema.partial().safeParse(body);
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
    .update(moneyMerchant)
    .set(updates)
    .where(
      and(
        eq(moneyMerchant.id, id),
        eq(moneyMerchant.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();

  if (!updated) throw new Error("NOT_FOUND");

  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function deleteMoneyMerchant(
  ctx: MoneyWorkspaceCtx,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(moneyMerchant)
    .where(
      and(
        eq(moneyMerchant.id, id),
        eq(moneyMerchant.workspaceId, ctx.workspaceId),
      ),
    )
    .returning({ id: moneyMerchant.id });

  return deleted.length > 0;
}
