import { and, asc, desc, eq, getTableColumns, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyAccount,
  moneyCategory,
  moneyTag,
  moneyTransaction,
} from "@/db/schema/money";
import type { BootstrapWorkspaceRow } from "@/lib/workspace-list";

export type { BootstrapWorkspaceRow } from "@/lib/workspace-list";
export { fetchWorkspacesForUser } from "@/lib/workspace-list";

const USAGE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export type MoneyWorkspaceCoreData = {
  workspaceId: string;
  defaultCurrency: string | null;
  needsCurrencySetup: boolean;
  workspaces: BootstrapWorkspaceRow[];
  /** User’s saved default workspace for this app (may differ from active cookie). */
  defaultWorkspaceId: string | null;
};

/** Accounts / categories / merchants / tags matching individual money API GET shapes. */
export async function fetchMoneyLookups(
  workspaceId: string,
  workspaceCurrency: string,
) {
  const since = new Date(Date.now() - USAGE_WINDOW_MS);

  const [accountRows, categoryRows, tagRows] = await Promise.all([
    db
      .select({
        ...getTableColumns(moneyAccount),
        usageCount: sql<number>`count(${moneyTransaction.id})::int`.as(
          "usage_count",
        ),
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
      .orderBy(desc(sql`usage_count`), asc(moneyAccount.name)),
    db
      .select({
        ...getTableColumns(moneyCategory),
        usageCount: sql<number>`count(${moneyTransaction.id})::int`.as(
          "usage_count",
        ),
      })
      .from(moneyCategory)
      .leftJoin(
        moneyTransaction,
        and(
          eq(moneyTransaction.categoryId, moneyCategory.id),
          eq(moneyTransaction.workspaceId, workspaceId),
          gte(moneyTransaction.occurredAt, since),
        ),
      )
      .where(eq(moneyCategory.workspaceId, workspaceId))
      .groupBy(moneyCategory.id)
      .orderBy(desc(sql`usage_count`), asc(moneyCategory.name)),
    db
      .select()
      .from(moneyTag)
      .where(eq(moneyTag.workspaceId, workspaceId))
      .orderBy(asc(moneyTag.name)),
  ]);

  return {
    accounts: accountRows.map((r) => ({
      ...r,
      currency: workspaceCurrency,
      createdAt: r.createdAt.toISOString(),
    })),
    categories: categoryRows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    tags: tagRows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/** JSON `data` field from GET /api/money/workspace/bootstrap */
export type MoneyWorkspaceBootstrapData = MoneyWorkspaceCoreData &
  Awaited<ReturnType<typeof fetchMoneyLookups>>;
