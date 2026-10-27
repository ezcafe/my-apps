/**
 * Measure harness for investments ledger + loan installments list spans (Task 1).
 * Write owner for fixture = seed helper only; this module times reads.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { moneyAccount } from "@/db/schema/money";
import {
  cleanupInvestmentsLoansPerfFixture,
  INVESTMENTS_LOANS_PERF_FIXTURE_MIN_INSTALLMENTS,
  INVESTMENTS_LOANS_PERF_FIXTURE_MIN_TX,
  seedInvestmentsLoansPerfFixture,
  type SeedInvestmentsLoansPerfFixtureResult,
} from "@/lib/investments-loans-perf-fixture";
import {
  createInvestmentsLoansPerfSpans,
  INVESTMENTS_PERF_SPAN_NAMES,
  LOANS_PERF_SPAN_NAMES,
  rankInvestmentsLoansPerfSpans,
  type InvestmentsLoansPerfSpan,
} from "@/lib/investments-loans-perf-spans";
import { listLoansInstallments } from "@/lib/loans-services/installments-list";
import { getLoanDetail } from "@/lib/loans-services/loans";
import { moneyLedgerFirstLoadFilterQuery } from "@/lib/money-first-load-filters";
import { MONEY_LEDGER_INVESTMENT } from "@/lib/money-ledger-presets";
import { moneyTransactionsListQueryInput } from "@/lib/money-query-options";
import { computeMoneyAnalyticsSummary } from "@/lib/money-services/analytics";
import { listMoneyTransactions } from "@/lib/money-services/transactions";

const PAGE_SIZE = 20;
const INSTALLMENTS_PAGE = 50;

export const INVESTMENTS_LOANS_PERF_READ_SPAN_NAMES = [
  ...INVESTMENTS_PERF_SPAN_NAMES,
  ...LOANS_PERF_SPAN_NAMES,
] as const;

export type InvestmentsLoansPerfMeasureResult = {
  fixture: SeedInvestmentsLoansPerfFixtureResult;
  spans: InvestmentsLoansPerfSpan[];
  rankedInvestments: InvestmentsLoansPerfSpan[];
  rankedLoans: InvestmentsLoansPerfSpan[];
  ranked: InvestmentsLoansPerfSpan[];
};

export type InvestmentsLoansPerfMeasureOptions = {
  now?: Date;
  txCount?: number;
  installmentCount?: number;
  topN?: number;
  keepFixture?: boolean;
};

export async function measureInvestmentsLoansListPerf(
  options: InvestmentsLoansPerfMeasureOptions = {},
): Promise<InvestmentsLoansPerfMeasureResult> {
  const now = options.now ?? new Date();
  const txCount = options.txCount ?? INVESTMENTS_LOANS_PERF_FIXTURE_MIN_TX;
  const installmentCount =
    options.installmentCount ?? INVESTMENTS_LOANS_PERF_FIXTURE_MIN_INSTALLMENTS;
  const topN = options.topN ?? 6;
  const spans = createInvestmentsLoansPerfSpans();

  const fixture = await spans.time("fixture.seed", () =>
    seedInvestmentsLoansPerfFixture({ now, txCount, installmentCount }),
  );

  const accounts = await db
    .select({ id: moneyAccount.id, type: moneyAccount.type })
    .from(moneyAccount)
    .where(eq(moneyAccount.workspaceId, fixture.workspaceId));

  const filterQuery = moneyLedgerFirstLoadFilterQuery(
    MONEY_LEDGER_INVESTMENT,
    accounts,
    [],
    now,
  );
  const listInput = moneyTransactionsListQueryInput(
    filterQuery,
    1,
    PAGE_SIZE,
    "occurredAt",
    "desc",
    false,
  );

  await spans.time("investments.list", () =>
    listMoneyTransactions(fixture.workspaceId, listInput),
  );

  await spans.time("investments.summary", () =>
    computeMoneyAnalyticsSummary(fixture.workspaceId, {
      from: listInput.from as string,
      to: listInput.to as string,
      accountTypes: ["investment"],
    }),
  );

  await spans.time("investments.overview", async () => {
    // Stand-in for ATF/holdings/open overview seed cost.
    return { accountCount: accounts.length };
  });

  await spans.time("investments.dehydrate", async () => {
    return {
      workspaceId: fixture.workspaceId,
      page: 1,
      pageSize: PAGE_SIZE,
      filterQuery,
    };
  });

  await spans.time("loans.detail.serialize", () =>
    getLoanDetail(
      {
        userSub: fixture.ownerSub,
        workspaceId: fixture.workspaceId,
      },
      fixture.loanId,
    ),
  );

  await spans.time("loans.list.page1", () =>
    listLoansInstallments(fixture.workspaceId, {
      loanId: fixture.loanId,
      limit: INSTALLMENTS_PAGE,
    }),
  );

  await spans.time("loans.table.paint", async () => {
    // Stand-in for client table paint / filter remount cost.
    return { filter: "upcoming", pageSize: INSTALLMENTS_PAGE };
  });

  const snapshot = spans.snapshot();
  const investmentSpans = snapshot.filter((s) =>
    (INVESTMENTS_PERF_SPAN_NAMES as readonly string[]).includes(s.name),
  );
  const loanSpans = snapshot.filter((s) =>
    (LOANS_PERF_SPAN_NAMES as readonly string[]).includes(s.name),
  );
  const rankedInvestments = rankInvestmentsLoansPerfSpans(
    investmentSpans,
    topN,
  );
  const rankedLoans = rankInvestmentsLoansPerfSpans(loanSpans, topN);
  const ranked = rankInvestmentsLoansPerfSpans(
    snapshot.filter((s) =>
      (INVESTMENTS_LOANS_PERF_READ_SPAN_NAMES as readonly string[]).includes(
        s.name,
      ),
    ),
    topN,
  );

  if (!options.keepFixture) {
    await cleanupInvestmentsLoansPerfFixture();
  }

  return {
    fixture,
    spans: snapshot,
    rankedInvestments,
    rankedLoans,
    ranked,
  };
}

export function formatInvestmentsLoansPerfRankTable(
  ranked: ReadonlyArray<InvestmentsLoansPerfSpan>,
): string {
  const lines = [
    "| Rank | Span | ms |",
    "|------|------|---:|",
    ...ranked.map(
      (s, i) => `| ${i + 1} | \`${s.name}\` | ${s.ms.toFixed(1)} |`,
    ),
  ];
  return lines.join("\n");
}
