import { and, eq, isNull } from "drizzle-orm";
import type { AppDatabase } from "@/db";
import { moneyAccount, moneyCategory } from "@/db/schema/money";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";

export const MONEY_SEED_NECESSITIES = "Necessities";
export const MONEY_SEED_BILLS = "Bills";

export const MONEY_SYSTEM_ACCOUNT_KEYS = [
  "credit",
  "savings",
  "investment",
  "loan",
] as const;

export type MoneySystemAccountKey = (typeof MONEY_SYSTEM_ACCOUNT_KEYS)[number];

export type MoneySystemAccountSeed = {
  systemKey: MoneySystemAccountKey;
  name: string;
  type: MoneySystemAccountKey;
  sortOrder: number;
};

/** Canonical display names for seeded system accounts. */
export const MONEY_SYSTEM_ACCOUNT_SEEDS: readonly MoneySystemAccountSeed[] = [
  {
    systemKey: "credit",
    name: "Credit Card",
    type: "credit",
    sortOrder: 0,
  },
  {
    systemKey: "savings",
    name: "Savings",
    type: "savings",
    sortOrder: 1,
  },
  {
    systemKey: "investment",
    name: "Investments",
    type: "investment",
    sortOrder: 2,
  },
  {
    systemKey: "loan",
    name: "Loans",
    type: "loan",
    sortOrder: 3,
  },
] as const;

/** Resolve seeded Bills category (child of Necessities) from loaded category rows. */
export function findSeedBillsCategoryId(
  categories: ReadonlyArray<Pick<MoneyCategoryRow, "id" | "name" | "parentId">>,
): string | undefined {
  const necessities = categories.find(
    (c) => c.name === MONEY_SEED_NECESSITIES && c.parentId == null,
  );
  if (!necessities) return undefined;
  return categories.find(
    (c) => c.name === MONEY_SEED_BILLS && c.parentId === necessities.id,
  )?.id;
}

/** Resolve a seeded system account id from loaded account rows. */
export function findSystemAccountId(
  accounts: ReadonlyArray<{ id: string; systemKey?: string | null }>,
  systemKey: MoneySystemAccountKey,
): string | undefined {
  return accounts.find((a) => a.systemKey === systemKey)?.id;
}

type MoneyTx = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

/** Idempotent: ensure Bills exists under Necessities (creates Necessities if missing). */
export async function ensureBillsCategory(
  tx: MoneyTx,
  workspaceId: string,
): Promise<string> {
  let [necessities] = await tx
    .select({ id: moneyCategory.id })
    .from(moneyCategory)
    .where(
      and(
        eq(moneyCategory.workspaceId, workspaceId),
        eq(moneyCategory.name, MONEY_SEED_NECESSITIES),
        eq(moneyCategory.kind, "expense"),
        isNull(moneyCategory.parentId),
      ),
    )
    .limit(1);

  if (!necessities) {
    [necessities] = await tx
      .insert(moneyCategory)
      .values({
        workspaceId,
        name: MONEY_SEED_NECESSITIES,
        kind: "expense",
      })
      .returning({ id: moneyCategory.id });
  }

  const [existingBills] = await tx
    .select({ id: moneyCategory.id })
    .from(moneyCategory)
    .where(
      and(
        eq(moneyCategory.workspaceId, workspaceId),
        eq(moneyCategory.name, MONEY_SEED_BILLS),
        eq(moneyCategory.parentId, necessities!.id),
      ),
    )
    .limit(1);
  if (existingBills) return existingBills.id;

  const [inserted] = await tx
    .insert(moneyCategory)
    .values({
      workspaceId,
      name: MONEY_SEED_BILLS,
      kind: "expense",
      parentId: necessities!.id,
    })
    .returning({ id: moneyCategory.id });
  return inserted!.id;
}

export async function ensureBillsCategoryForWorkspace(
  db: AppDatabase,
  workspaceId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await ensureBillsCategory(tx, workspaceId);
  });
}

/**
 * Seeds still missing for a workspace (by systemKey). Used by ensure and tests.
 */
export function systemAccountSeedsToCreate(
  existingSystemKeys: ReadonlySet<string>,
): MoneySystemAccountSeed[] {
  return MONEY_SYSTEM_ACCOUNT_SEEDS.filter(
    (s) => !existingSystemKeys.has(s.systemKey),
  );
}

/**
 * Idempotent by systemKey only: inserts missing system accounts.
 * Does not adopt user-created accounts by name (may create a second "Savings").
 */
export async function ensureDefaultSystemAccounts(
  tx: MoneyTx,
  workspaceId: string,
  currency = "USD",
): Promise<void> {
  const existingRows = await tx
    .select({ systemKey: moneyAccount.systemKey })
    .from(moneyAccount)
    .where(eq(moneyAccount.workspaceId, workspaceId));
  const existingKeys = new Set(
    existingRows
      .map((r) => r.systemKey)
      .filter((k): k is string => k != null),
  );
  const toCreate = systemAccountSeedsToCreate(existingKeys);
  if (toCreate.length === 0) return;

  await tx.insert(moneyAccount).values(
    toCreate.map((seed) => ({
      workspaceId,
      name: seed.name,
      type: seed.type,
      currency,
      sortOrder: seed.sortOrder,
      systemKey: seed.systemKey,
    })),
  );
}

export async function ensureDefaultSystemAccountsForWorkspace(
  db: AppDatabase,
  workspaceId: string,
  currency = "USD",
): Promise<void> {
  await db.transaction(async (tx) => {
    await ensureDefaultSystemAccounts(tx, workspaceId, currency);
  });
}
