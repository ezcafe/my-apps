import { and, asc, desc, eq, getTableColumns, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { moneyAccount, moneyTransaction } from "@/db/schema/money";
import { getWorkspaceDefaultCurrency } from "@/lib/workspace";
import { accountCreateSchema } from "@/lib/validators/money";
import type { MoneyWorkspaceCtx } from "@/lib/money-services/types";

const USAGE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export async function listMoneyAccounts(workspaceId: string) {
  const since = new Date(Date.now() - USAGE_WINDOW_MS);
  const rows = await db
    .select({
      ...getTableColumns(moneyAccount),
      usageCount: sql<number>`count(${moneyTransaction.id})::int`.as("usage_count"),
    })
    .from(moneyAccount)
    .leftJoin(
      moneyTransaction,
      and(
        eq(moneyTransaction.accountId, moneyAccount.id),
        eq(moneyTransaction.workspaceId, workspaceId),
        gte(moneyTransaction.occurredAt, since),
      ),
    )
    .where(eq(moneyAccount.workspaceId, workspaceId))
    .groupBy(moneyAccount.id)
    .orderBy(desc(sql`usage_count`), asc(moneyAccount.name));

  const workspaceCurrency =
    (await getWorkspaceDefaultCurrency(workspaceId)) ?? "USD";

  return rows.map((r) => ({
    ...r,
    currency: workspaceCurrency,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createMoneyAccount(ctx: MoneyWorkspaceCtx, body: unknown) {
  const parsed = accountCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }
  const workspaceCurrency =
    (await getWorkspaceDefaultCurrency(ctx.workspaceId)) ?? "USD";
  const [created] = await db
    .insert(moneyAccount)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      type: parsed.data.type ?? "checking",
      currency: workspaceCurrency,
      institution: parsed.data.institution ?? null,
      balanceMinor: parsed.data.balanceMinor,
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .returning();

  return {
    ...created,
    currency: workspaceCurrency,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function updateMoneyAccount(
  ctx: MoneyWorkspaceCtx,
  id: string,
  body: unknown,
) {
  const parsed = accountCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    throw new Error(
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

  if (!updated) throw new Error("NOT_FOUND");
  const workspaceCurrency =
    (await getWorkspaceDefaultCurrency(ctx.workspaceId)) ?? "USD";

  return {
    ...updated,
    currency: workspaceCurrency,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function archiveMoneyAccount(
  ctx: MoneyWorkspaceCtx,
  id: string,
): Promise<boolean> {
  const [row] = await db
    .update(moneyAccount)
    .set({ archived: true })
    .where(
      and(
        eq(moneyAccount.id, id),
        eq(moneyAccount.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();

  return !!row;
}
