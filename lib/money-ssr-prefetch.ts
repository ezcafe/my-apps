import type { QueryClient } from "@tanstack/react-query";
import type { MoneyLedgerPreset } from "@/lib/money-ledger-presets";
import type { MoneyWorkspaceBootstrapData } from "@/lib/money-workspace-bootstrap-data";
import {
  seedMoneyAnalyticsPage,
  seedMoneyBootstrap,
  seedMoneyInvestmentsHome,
  seedMoneyLedgerPage,
  seedMoneyLoansHome,
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
) {
  await seedMoneyLedgerPage(queryClient, userSub, preset);
}

/**
 * Analytics tab — bootstrap + combined ATF dashboard + distribution.
 * Budgets / sankey / leaders stay client lazy.
 */
export async function prefetchMoneyAnalytics(
  queryClient: QueryClient,
  userSub: string,
) {
  await seedMoneyAnalyticsPage(queryClient, userSub);
}

/** Loans home — money + loans bootstrap and loan list. */
export async function prefetchMoneyLoansHome(
  queryClient: QueryClient,
  userSub: string,
) {
  await seedMoneyLoansHome(queryClient, userSub);
}

/** Investments home — money + investment bootstrap, holdings, default series. */
export async function prefetchMoneyInvestmentsHome(
  queryClient: QueryClient,
  userSub: string,
) {
  await seedMoneyInvestmentsHome(queryClient, userSub);
}
