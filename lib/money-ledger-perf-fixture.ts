/**
 * Synthetic ≥10k transaction workspace for money ledger perf measure.
 * Write owner = this helper / measure script only — never prod list paths.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { moneyAccount, moneyTransaction } from "@/db/schema/money";
import { workspace } from "@/db/schema/workspace";
import { dateRangeParams } from "@/lib/analytics-build-query";
import { defaultAnalyticsFilters } from "@/lib/analytics-default-filters";

export const MONEY_LEDGER_PERF_OWNER_SUB = "synthetic-money-ledger-perf";
export const MONEY_LEDGER_PERF_WORKSPACE_NAME = "Money ledger perf fixture";
/** Stable synthetic workspace id (never a real user workspace). */
export const MONEY_LEDGER_PERF_WORKSPACE_ID =
  "b1000000-0000-4000-8000-000000000001";
/** Default seed size for measure (≥10k under first-load predicates). */
export const MONEY_LEDGER_PERF_FIXTURE_MIN_TX = 10_000;

const BATCH_SIZE = 500;

export type MoneyLedgerPerfMeasureWindow = {
  from: string;
  to: string;
  fromDate: string;
  toDate: string;
};

/** Same calendar-month ISO bounds as Spending first-load filter query. */
export function moneyLedgerPerfMeasureWindow(
  now: Date = new Date(),
): MoneyLedgerPerfMeasureWindow {
  const { fromDate, toDate } = defaultAnalyticsFilters(now);
  const { from, to } = dateRangeParams(fromDate, toDate);
  return { from, to, fromDate, toDate };
}

export type SeedMoneyLedgerPerfFixtureOptions = {
  now?: Date;
  /** Override for fast tests; measure uses default ≥10k. */
  txCount?: number;
  workspaceId?: string;
};

export type SeedMoneyLedgerPerfFixtureResult = {
  workspaceId: string;
  accountId: string;
  ownerSub: typeof MONEY_LEDGER_PERF_OWNER_SUB;
  txCount: number;
  window: MoneyLedgerPerfMeasureWindow;
};

export async function cleanupMoneyLedgerPerfFixture(): Promise<void> {
  await db
    .delete(workspace)
    .where(eq(workspace.ownedByUserSub, MONEY_LEDGER_PERF_OWNER_SUB));
}

export async function seedMoneyLedgerPerfFixture(
  options: SeedMoneyLedgerPerfFixtureOptions = {},
): Promise<SeedMoneyLedgerPerfFixtureResult> {
  const now = options.now ?? new Date();
  const txCount = options.txCount ?? MONEY_LEDGER_PERF_FIXTURE_MIN_TX;
  if (txCount < 1) throw new Error("txCount must be >= 1");

  const window = moneyLedgerPerfMeasureWindow(now);
  const fromMs = Date.parse(window.from);
  const toMs = Date.parse(window.to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) {
    throw new Error("Invalid measure window");
  }

  await cleanupMoneyLedgerPerfFixture();

  const workspaceId = options.workspaceId ?? MONEY_LEDGER_PERF_WORKSPACE_ID;
  await db.insert(workspace).values({
    id: workspaceId,
    name: MONEY_LEDGER_PERF_WORKSPACE_NAME,
    kind: "personal",
    ownedByUserSub: MONEY_LEDGER_PERF_OWNER_SUB,
    defaultCurrency: "USD",
  });

  const [account] = await db
    .insert(moneyAccount)
    .values({
      workspaceId,
      name: "Perf Checking",
      type: "checking",
      currency: "USD",
    })
    .returning({ id: moneyAccount.id });

  const accountId = account.id;
  const spanMs = toMs - fromMs;

  for (let offset = 0; offset < txCount; offset += BATCH_SIZE) {
    const n = Math.min(BATCH_SIZE, txCount - offset);
    const rows = Array.from({ length: n }, (_, i) => {
      const index = offset + i;
      const occurredAt = new Date(
        fromMs + Math.floor((spanMs * (index + 1)) / (txCount + 1)),
      );
      return {
        workspaceId,
        accountId,
        kind: "expense" as const,
        amountMinor: 100 + (index % 900),
        occurredAt,
        notes: null,
        createdBySub: MONEY_LEDGER_PERF_OWNER_SUB,
        excludeFromAnalyticsAndBudget: false,
      };
    });
    await db.insert(moneyTransaction).values(rows);
  }

  return {
    workspaceId,
    accountId,
    ownerSub: MONEY_LEDGER_PERF_OWNER_SUB,
    txCount,
    window,
  };
}
