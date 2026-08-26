import type { QueryClient } from "@tanstack/react-query";
import type { MoneyLedgerPreset } from "@/lib/money-ledger-presets";
import type { MoneyWorkspaceBootstrapData } from "@/lib/money-workspace-bootstrap-data";
import {
  seedMoneyAnalyticsPage,
  seedMoneyBootstrap,
  seedInvestmentOverview,
  seedMoneyInvestmentsHome,
  seedMoneyInvestmentsLayout,
  seedMoneyLedgerPage,
  seedMoneyLoansHome,
  seedLoansInsightsPage,
  seedLoansLayout,
} from "@/lib/money-ssr-seed";

/** Prefetch bootstrap only (money layout — must hydrate above MoneyWorkspaceProvider). */
export async function prefetchMoneyBootstrapForLayout(
  queryClient: QueryClient,
  userSub: string,
): Promise<MoneyWorkspaceBootstrapData | undefined> {
  return seedMoneyBootstrap(queryClient, userSub);
}

/** Ledger tabs — bootstrap + chart lookups + page-1 transactions. */
export async function prefetchMoneyLedger(
  queryClient: QueryClient,
  preset: MoneyLedgerPreset,
  userSub: string,
  options?: { includeSummary?: boolean },
) {
  await seedMoneyLedgerPage(queryClient, userSub, preset, options);
}

/**
 * Analytics tab — workspace id + ATF in parallel with full bootstrap lookups.
 * Budgets / sankey / leaders stay client lazy.
 */
export async function prefetchMoneyAnalytics(
  queryClient: QueryClient,
  userSub: string,
) {
  await seedMoneyAnalyticsPage(queryClient, userSub);
}

/** Loans layout — money + loans bootstrap. */
export async function prefetchLoansLayout(
  queryClient: QueryClient,
  userSub: string,
) {
  await seedLoansLayout(queryClient, userSub);
}

/** Loans home — money + loans bootstrap and loan list. */
export async function prefetchMoneyLoansHome(
  queryClient: QueryClient,
  userSub: string,
) {
  await seedMoneyLoansHome(queryClient, userSub);
}

export async function prefetchLoansInsights(
  queryClient: QueryClient,
  userSub: string,
) {
  await seedLoansInsightsPage(queryClient, userSub);
}

/** Investments layout — money + investment bootstrap. */
export async function prefetchMoneyInvestmentsLayout(
  queryClient: QueryClient,
  userSub: string,
) {
  await seedMoneyInvestmentsLayout(queryClient, userSub);
}

/** Investments overview — holdings + open activities above ledger. */
export async function prefetchInvestmentOverview(
  queryClient: QueryClient,
  userSub: string,
) {
  await seedInvestmentOverview(queryClient, userSub);
}

/** Investments insights — ATF summary + series + allocation. */
export async function prefetchMoneyInvestmentsHome(
  queryClient: QueryClient,
  userSub: string,
) {
  await seedMoneyInvestmentsHome(queryClient, userSub);
}
