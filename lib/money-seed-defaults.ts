import { and, eq, isNull } from "drizzle-orm";
import type { AppDatabase } from "@/db";
import { moneyAccount, moneyCategory } from "@/db/schema/money";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";

export const MONEY_SEED_NECESSITIES = "Necessities";
export const MONEY_SEED_BILLS = "Bills";
export const MONEY_SEED_LOANS = "Loans";
export const MONEY_SEED_FINANCIAL_FREEDOM = "Financial Freedom";

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

type SeedCategoryRef = Pick<MoneyCategoryRow, "id" | "name" | "parentId">;

/** Resolve a seeded Necessities child category from loaded category rows. */
export function findSeedNecessitiesChildCategoryId(
  categories: ReadonlyArray<SeedCategoryRef>,
  childName: string,
): string | undefined {
  const necessities = categories.find(
    (c) => c.name === MONEY_SEED_NECESSITIES && c.parentId == null,
  );
  if (!necessities) return undefined;
  return categories.find(
    (c) => c.name === childName && c.parentId === necessities.id,
  )?.id;
}

/** Resolve seeded Bills category (child of Necessities) from loaded category rows. */
export function findSeedBillsCategoryId(
  categories: ReadonlyArray<SeedCategoryRef>,
): string | undefined {
  return findSeedNecessitiesChildCategoryId(categories, MONEY_SEED_BILLS);
}

/** Resolve seeded Loans category (child of Necessities) from loaded category rows. */
export function findSeedLoansCategoryId(
  categories: ReadonlyArray<SeedCategoryRef>,
): string | undefined {
  return findSeedNecessitiesChildCategoryId(categories, MONEY_SEED_LOANS);
}

/** Resolve seeded Financial Freedom root category from loaded category rows. */
export function findSeedFinancialFreedomCategoryId(
  categories: ReadonlyArray<SeedCategoryRef>,
): string | undefined {
  return categories.find(
    (c) => c.name === MONEY_SEED_FINANCIAL_FREEDOM && c.parentId == null,
  )?.id;
}

/** Check if Bills or Loans under Necessities are missing. */
export function needsNecessitiesSeedCategories(
  categories: ReadonlyArray<SeedCategoryRef>,
): boolean {
  return (
    findSeedBillsCategoryId(categories) === undefined ||
    findSeedLoansCategoryId(categories) === undefined
  );
}

/** Check if any required system account seeds are missing. */
export function needsDefaultSystemAccounts(
  accounts: ReadonlyArray<{ systemKey: string | null }>,
): boolean {
  const existingKeys = new Set(
    accounts.map((a) => a.systemKey).filter((k): k is string => k != null),
  );
  return systemAccountSeedsToCreate(existingKeys).length > 0;
}

/**
 * Preferred expense category when the user has not picked one yet:
 * Investments/Savings → Financial Freedom; Loans → Loans (under Necessities).
 */
export function preferredExpenseCategoryIdForAccountType(
  accountType: string | undefined | null,
  categories: ReadonlyArray<SeedCategoryRef>,
): string | undefined {
  if (accountType === "investment" || accountType === "savings") {
    return findSeedFinancialFreedomCategoryId(categories);
  }
  if (accountType === "loan") {
    return findSeedLoansCategoryId(categories);
  }
  return undefined;
}

/** Resolve a seeded system account id from loaded account rows. */
export function findSystemAccountId(
  accounts: ReadonlyArray<{ id: string; systemKey?: string | null }>,
  systemKey: MoneySystemAccountKey,
): string | undefined {
  return accounts.find((a) => a.systemKey === systemKey)?.id;
}

type MoneyTx = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

/** Idempotent: ensure a child category under Necessities (creates Necessities if missing). */
export async function ensureNecessitiesChildCategory(
  tx: MoneyTx,
  workspaceId: string,
  childName: string,
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

  const [existing] = await tx
    .select({ id: moneyCategory.id })
    .from(moneyCategory)
    .where(
      and(
        eq(moneyCategory.workspaceId, workspaceId),
        eq(moneyCategory.name, childName),
        eq(moneyCategory.parentId, necessities!.id),
      ),
    )
    .limit(1);
  if (existing) return existing.id;

  const [inserted] = await tx
    .insert(moneyCategory)
    .values({
      workspaceId,
      name: childName,
      kind: "expense",
      parentId: necessities!.id,
    })
    .returning({ id: moneyCategory.id });
  return inserted!.id;
}

/** Idempotent: ensure Bills exists under Necessities (creates Necessities if missing). */
export async function ensureBillsCategory(
  tx: MoneyTx,
  workspaceId: string,
): Promise<string> {
  return ensureNecessitiesChildCategory(tx, workspaceId, MONEY_SEED_BILLS);
}

/** Idempotent: ensure Loans exists under Necessities (creates Necessities if missing). */
export async function ensureLoansCategory(
  tx: MoneyTx,
  workspaceId: string,
): Promise<string> {
  return ensureNecessitiesChildCategory(tx, workspaceId, MONEY_SEED_LOANS);
}

export async function ensureBillsCategoryForWorkspace(
  db: AppDatabase,
  workspaceId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await ensureBillsCategory(tx, workspaceId);
  });
}

export async function ensureLoansCategoryForWorkspace(
  db: AppDatabase,
  workspaceId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await ensureLoansCategory(tx, workspaceId);
  });
}

/** Ensure Bills + Loans under Necessities in one transaction. */
export async function ensureNecessitiesSeedCategoriesForWorkspace(
  db: AppDatabase,
  workspaceId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await ensureBillsCategory(tx, workspaceId);
    await ensureLoansCategory(tx, workspaceId);
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
