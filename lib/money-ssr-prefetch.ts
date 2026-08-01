import type { QueryClient } from "@tanstack/react-query";
import {
  investmentDefaultChartRange,
  moneyLedgerFirstLoadFilterQuery,
  moneyDefaultMonthFilterQuery,
} from "@/lib/money-first-load-filters";
import type { MoneyLedgerPreset } from "@/lib/money-ledger-presets";
import type { MoneyWorkspaceBootstrapData } from "@/lib/money-workspace-bootstrap-data";
import {
  moneyAnalyticsChartLookupsQueryOptions,
  moneyAnalyticsDistributionQueryOptions,
  moneyAnalyticsOverviewQueryOptions,
  moneyAnalyticsSummaryQueryOptions,
  moneyBootstrapQueryKey,
  moneyBootstrapQueryOptions,
  moneyTransactionsQueryOptions,
} from "@/lib/money-query-options";
import {
  investmentBootstrapQueryOptions,
  investmentHoldingsQueryOptions,
  investmentPortfolioSeriesQueryOptions,
} from "@/lib/investment-query-options";
import {
  loansBootstrapQueryOptions,
  loansListQueryOptions,
} from "@/lib/loans-query-options";

const TRANSACTIONS_PAGE_SIZE = 20;

async function prefetchMoneyBootstrap(
  queryClient: QueryClient,
): Promise<MoneyWorkspaceBootstrapData | undefined> {
  try {
    await queryClient.prefetchQuery(moneyBootstrapQueryOptions());
    return queryClient.getQueryData<MoneyWorkspaceBootstrapData>(
      moneyBootstrapQueryKey,
    );
  } catch {
    // Unauthenticated or transient GraphQL failure — page still renders client-side.
    return undefined;
  }
}

/** Prefetch bootstrap only (money layout — must hydrate above MoneyWorkspaceProvider). */
export async function prefetchMoneyBootstrapForLayout(
  queryClient: QueryClient,
): Promise<MoneyWorkspaceBootstrapData | undefined> {
  const boot = await prefetchMoneyBootstrap(queryClient);
  if (boot) seedChartLookupsFromBootstrap(queryClient, boot);
  return boot;
}

function seedChartLookupsFromBootstrap(
  queryClient: QueryClient,
  boot: MoneyWorkspaceBootstrapData,
) {
  if (!boot.workspaceId) return;
  queryClient.setQueryData(
    ["money", "analyticsChartLookups", boot.workspaceId],
    {
      moneyAccounts: boot.accounts,
      moneyCategories: boot.categories,
      moneyTags: boot.tags,
    },
  );
}

/** Ledger tabs — bootstrap + chart lookups + page-1 transactions. */
export async function prefetchMoneyLedger(
  queryClient: QueryClient,
  preset: MoneyLedgerPreset,
) {
  const boot = await prefetchMoneyBootstrap(queryClient);
  if (!boot?.workspaceId) return;

  seedChartLookupsFromBootstrap(queryClient, boot);
  const workspaceKey = boot.workspaceId;
  const filterQuery = moneyLedgerFirstLoadFilterQuery(
    preset,
    boot.accounts,
    boot.categories,
  );

  await Promise.all([
    queryClient.prefetchQuery(
      moneyAnalyticsChartLookupsQueryOptions(workspaceKey),
    ),
    queryClient.prefetchQuery(
      moneyTransactionsQueryOptions(
        workspaceKey,
        filterQuery,
        1,
        TRANSACTIONS_PAGE_SIZE,
        "occurredAt",
        "desc",
      ),
    ),
  ]);
}

/**
 * Analytics tab — bootstrap + chart lookups + summary + distribution.
 * Budgets / sankey / leaders stay client lazy; overview is warmed for expand.
 */
export async function prefetchMoneyAnalytics(queryClient: QueryClient) {
  const boot = await prefetchMoneyBootstrap(queryClient);
  if (!boot?.workspaceId) return;

  seedChartLookupsFromBootstrap(queryClient, boot);
  const filterQuery = moneyDefaultMonthFilterQuery();
  const workspaceKey = boot.workspaceId;

  await Promise.all([
    queryClient.prefetchQuery(
      moneyAnalyticsChartLookupsQueryOptions(workspaceKey),
    ),
    queryClient.prefetchQuery(
      moneyAnalyticsSummaryQueryOptions(workspaceKey, filterQuery),
    ),
    queryClient.prefetchQuery(
      moneyAnalyticsDistributionQueryOptions(workspaceKey, filterQuery),
    ),
    queryClient.prefetchQuery(
      moneyAnalyticsOverviewQueryOptions(workspaceKey, filterQuery),
    ),
  ]);
}

/** Loans home — money + loans bootstrap and loan list. */
export async function prefetchMoneyLoansHome(queryClient: QueryClient) {
  await Promise.all([
    prefetchMoneyBootstrap(queryClient).then((boot) => {
      if (boot) seedChartLookupsFromBootstrap(queryClient, boot);
    }),
    queryClient.prefetchQuery(loansBootstrapQueryOptions()).catch(() => {}),
    queryClient.prefetchQuery(loansListQueryOptions()).catch(() => {}),
  ]);
}

/** Investments home — money + investment bootstrap, holdings, default series. */
export async function prefetchMoneyInvestmentsHome(queryClient: QueryClient) {
  const range = investmentDefaultChartRange(6);
  await Promise.all([
    prefetchMoneyBootstrap(queryClient).then((boot) => {
      if (boot) seedChartLookupsFromBootstrap(queryClient, boot);
    }),
    queryClient
      .prefetchQuery(investmentBootstrapQueryOptions())
      .catch(() => {}),
    queryClient.prefetchQuery(investmentHoldingsQueryOptions()).catch(() => {}),
    queryClient
      .prefetchQuery(
        investmentPortfolioSeriesQueryOptions(range.from, range.to),
      )
      .catch(() => {}),
  ]);
}
