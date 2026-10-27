/**
 * Dual synthetic workspace for investments ledger + loan installments list measure.
 * Write owner = this helper / measure script only — never prod list paths.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  loan,
  loanInstallmentStatus,
  loanScheduleInstallment,
} from "@/db/schema/loans";
import { moneyAccount, moneyTransaction } from "@/db/schema/money";
import { workspace } from "@/db/schema/workspace";
import { dateRangeParams } from "@/lib/analytics-build-query";
import { defaultAnalyticsFilters } from "@/lib/analytics-default-filters";
import { createLoan } from "@/lib/loans-services/loans";

export const INVESTMENTS_LOANS_PERF_OWNER_SUB =
  "synthetic-investments-loans-list-perf";
export const INVESTMENTS_LOANS_PERF_WORKSPACE_NAME =
  "Investments + loans list perf fixture";
/** Stable synthetic workspace id (never a real user workspace). */
export const INVESTMENTS_LOANS_PERF_WORKSPACE_ID =
  "b2000000-0000-4000-8000-000000000001";
/** Default investment ledger seed size for measure. */
export const INVESTMENTS_LOANS_PERF_FIXTURE_MIN_TX = 500;
/**
 * Default installment count — must exceed default list limit (50) so page-1
 * limit+1 yields hasMore / nextCursor.
 */
export const INVESTMENTS_LOANS_PERF_FIXTURE_MIN_INSTALLMENTS = 120;

const BATCH_SIZE = 500;
/** How many early installments to mark paid for chip-filter measure. */
const PAID_CHIP_COUNT = 20;

export type InvestmentsLoansPerfMeasureWindow = {
  from: string;
  to: string;
  fromDate: string;
  toDate: string;
};

/** Same calendar-month ISO bounds as investment ledger first-load filter query. */
export function investmentsLoansPerfMeasureWindow(
  now: Date = new Date(),
): InvestmentsLoansPerfMeasureWindow {
  const { fromDate, toDate } = defaultAnalyticsFilters(now);
  const { from, to } = dateRangeParams(fromDate, toDate);
  return { from, to, fromDate, toDate };
}

export type SeedInvestmentsLoansPerfFixtureOptions = {
  now?: Date;
  /** Override for fast tests; measure uses default ≥500. */
  txCount?: number;
  /** Override for fast tests; measure uses default ≥120. */
  installmentCount?: number;
  workspaceId?: string;
  /**
   * Personal workspace has a unique owned_by_user_sub index — parallel unit
   * tests must pass a distinct owner (default = measure owner).
   */
  ownerSub?: string;
};

export type SeedInvestmentsLoansPerfFixtureResult = {
  workspaceId: string;
  investmentAccountId: string;
  loanId: string;
  ownerSub: string;
  txCount: number;
  installmentCount: number;
  window: InvestmentsLoansPerfMeasureWindow;
};

/**
 * Cleanup synthetic fixture rows.
 * - No args: delete workspaces owned by the default measure owner.
 * - ownerSub: delete that owner's personal workspace(s).
 * - workspaceId: delete only that workspace id.
 */
export async function cleanupInvestmentsLoansPerfFixture(options?: {
  workspaceId?: string;
  ownerSub?: string;
}): Promise<void> {
  if (options?.workspaceId) {
    await db.delete(workspace).where(eq(workspace.id, options.workspaceId));
    return;
  }
  const owner = options?.ownerSub ?? INVESTMENTS_LOANS_PERF_OWNER_SUB;
  await db.delete(workspace).where(eq(workspace.ownedByUserSub, owner));
}

export async function seedInvestmentsLoansPerfFixture(
  options: SeedInvestmentsLoansPerfFixtureOptions = {},
): Promise<SeedInvestmentsLoansPerfFixtureResult> {
  const now = options.now ?? new Date();
  const txCount = options.txCount ?? INVESTMENTS_LOANS_PERF_FIXTURE_MIN_TX;
  const installmentCount =
    options.installmentCount ?? INVESTMENTS_LOANS_PERF_FIXTURE_MIN_INSTALLMENTS;
  if (txCount < 1) throw new Error("txCount must be >= 1");
  if (installmentCount < 1) throw new Error("installmentCount must be >= 1");

  const window = investmentsLoansPerfMeasureWindow(now);
  const fromMs = Date.parse(window.from);
  const toMs = Date.parse(window.to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) {
    throw new Error("Invalid measure window");
  }

  const workspaceId = options.workspaceId ?? INVESTMENTS_LOANS_PERF_WORKSPACE_ID;
  const ownerSub = options.ownerSub ?? INVESTMENTS_LOANS_PERF_OWNER_SUB;
  await cleanupInvestmentsLoansPerfFixture({ ownerSub });
  await db.insert(workspace).values({
    id: workspaceId,
    name: INVESTMENTS_LOANS_PERF_WORKSPACE_NAME,
    kind: "personal",
    ownedByUserSub: ownerSub,
    defaultCurrency: "USD",
  });

  const [account] = await db
    .insert(moneyAccount)
    .values({
      workspaceId,
      name: "Perf Investment",
      type: "investment",
      currency: "USD",
    })
    .returning({ id: moneyAccount.id });

  const investmentAccountId = account.id;
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
        accountId: investmentAccountId,
        kind: "expense" as const,
        amountMinor: 100 + (index % 900),
        occurredAt,
        notes: null,
        createdBySub: ownerSub,
        excludeFromAnalyticsAndBudget: false,
      };
    });
    await db.insert(moneyTransaction).values(rows);
  }

  // Start far enough in the past so termMonths installments exist and some are paid-chip eligible.
  const startDate = "2016-01-15";
  const { id: loanId } = await createLoan(
    {
      userSub: ownerSub,
      workspaceId,
    },
    {
      name: "Perf long-term loan",
      principalMinor: 5_000_000_00,
      annualRateBps: 450,
      termMonths: installmentCount,
      startDate,
      dueDayOfMonth: 15,
      autoMarkPastDuePaid: false,
    },
  );

  const scheduleRows = await db
    .select({ id: loanScheduleInstallment.id })
    .from(loanScheduleInstallment)
    .where(eq(loanScheduleInstallment.loanId, loanId))
    .orderBy(asc(loanScheduleInstallment.installmentNumber));

  if (scheduleRows.length !== installmentCount) {
    throw new Error(
      `Expected ${installmentCount} schedule rows, got ${scheduleRows.length}`,
    );
  }

  const paidIds = scheduleRows.slice(0, PAID_CHIP_COUNT).map((r) => r.id);
  if (paidIds.length > 0) {
    await db
      .update(loanInstallmentStatus)
      .set({
        status: "paid",
        paidAt: new Date(),
        paidWithoutTransaction: true,
        moneyTransactionId: null,
      })
      .where(
        and(
          eq(loanInstallmentStatus.status, "pending"),
          inArray(loanInstallmentStatus.scheduleInstallmentId, paidIds),
        ),
      );
  }

  // Keep loan active even if many paid — measure needs pending + paid chips.
  await db
    .update(loan)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(loan.id, loanId));

  return {
    workspaceId,
    investmentAccountId,
    loanId,
    ownerSub,
    txCount,
    installmentCount,
    window,
  };
}
