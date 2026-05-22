import { and, asc, desc, eq, getTableColumns, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyAccount,
  moneyCategory,
  moneyMerchant,
  moneyTag,
  moneyTransaction,
} from "@/db/schema/money";
import {
  userWorkspaceDefault,
  workspace,
  workspaceMember,
  type WorkspaceAppKey,
} from "@/db/schema/workspace";
import { getWorkspaceDefaultCurrency } from "@/lib/workspace";

const USAGE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export type BootstrapWorkspaceRow = {
  id: string;
  name: string;
  kind: "personal" | "shared";
  ownedByUserSub: string | null;
  defaultCurrency: string | null;
  role: "owner" | "member";
  isDefault: boolean;
};

/** Same rows as GET /api/workspace/list?app=money */
export async function fetchWorkspacesForUser(
  userSub: string,
  appKey: WorkspaceAppKey,
): Promise<{
  workspaces: BootstrapWorkspaceRow[];
  defaultWorkspaceId: string | null;
}> {
  const rows = await db
    .select({
      id: workspace.id,
      name: workspace.name,
      kind: workspace.kind,
      ownedByUserSub: workspace.ownedByUserSub,
      defaultCurrency: workspace.defaultCurrency,
      role: workspaceMember.role,
    })
    .from(workspaceMember)
    .innerJoin(workspace, eq(workspace.id, workspaceMember.workspaceId))
    .where(eq(workspaceMember.userSub, userSub));

  const prefRow = await db
    .select({ defaultWorkspaceId: userWorkspaceDefault.defaultWorkspaceId })
    .from(userWorkspaceDefault)
    .where(
      and(
        eq(userWorkspaceDefault.userSub, userSub),
        eq(userWorkspaceDefault.appKey, appKey),
      ),
    )
    .limit(1);
  const defaultWorkspaceId = prefRow[0]?.defaultWorkspaceId ?? null;

  const workspaces = rows.map((r) => ({
    ...r,
    isDefault: r.id === defaultWorkspaceId,
  }));
  return { workspaces, defaultWorkspaceId };
}

/** Accounts / categories / merchants / tags matching individual money API GET shapes. */
export async function fetchMoneyLookups(workspaceId: string) {
  const since = new Date(Date.now() - USAGE_WINDOW_MS);
  const workspaceCurrency =
    (await getWorkspaceDefaultCurrency(workspaceId)) ?? "USD";

  const [accountRows, categoryRows, merchantRows, tagRows] = await Promise.all([
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
      .orderBy(desc(sql`usage_count`), asc(moneyMerchant.name)),
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
    merchants: merchantRows.map((r) => ({
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
export type MoneyWorkspaceBootstrapData = {
  workspaceId: string;
  defaultCurrency: string | null;
  needsCurrencySetup: boolean;
  workspaces: BootstrapWorkspaceRow[];
  /** User’s saved default workspace for this app (may differ from active cookie). */
  defaultWorkspaceId: string | null;
} & Awaited<ReturnType<typeof fetchMoneyLookups>>;
