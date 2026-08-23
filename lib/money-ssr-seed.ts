import { cache } from "react";
import {
  dehydrate,
  defaultShouldDehydrateQuery,
  type QueryClient,
} from "@tanstack/react-query";
import { runInWorkspace } from "@/db";
import { filterQueryToGraphQLAnalyticsInput } from "@/lib/analytics-graphql-filters";
import {
  investmentDefaultChartRange,
  moneyDefaultMonthFilterQuery,
  moneyLedgerFirstLoadFilterQuery,
} from "@/lib/money-first-load-filters";
import { fetchInvestmentBootstrapSafe } from "@/lib/investment-services/bootstrap";
import {
  investmentHoldingsSnapshot,
  investmentPortfolioValueSeries,
} from "@/lib/investment-services/portfolio-series";
import { listOpenInvestmentActivities } from "@/lib/investment-services/activities";
import {
  investmentKeys,
  type InvestmentActivityRow,
  type InvestmentBootstrapData,
  type InvestmentHoldingRow,
  type InvestmentPortfolioPoint,
} from "@/lib/investment-query-options";
import { fetchLoansBootstrapSafe } from "@/lib/loans-services/bootstrap";
import { listLoans } from "@/lib/loans-services/loans";
import {
  loansKeys,
  type LoanListItem,
  type LoansBootstrapData,
} from "@/lib/loans-query-options";
import type { MoneyLedgerPreset } from "@/lib/money-ledger-presets";
import {
  computeMoneyAnalyticsAtf,
  computeMoneyAnalyticsSummary,
  type MoneyAnalyticsAtfPayload,
} from "@/lib/money-services/analytics";
import {
  completeMoneyBootstrapFromState,
  fetchMoneyWorkspaceStateSafe,
} from "@/lib/money-services/bootstrap";
import { listMoneyTransactions } from "@/lib/money-services/transactions";
import {
  moneyAnalyticsAtfQueryOptions,
  moneyAnalyticsChartLookupsQueryOptions,
  moneyAnalyticsSummaryQueryOptions,
  moneyBootstrapQueryKey,
  moneyTransactionsListQueryInput,
  moneyTransactionsQueryOptions,
  type MoneyAnalyticsAtfQueryResult,
  type MoneyAnalyticsChartLookups,
  type MoneyAnalyticsSummaryQueryResult,
  type MoneyTransactionsListResponse,
} from "@/lib/money-query-options";
import type { MoneyWorkspaceBootstrapData } from "@/lib/money-workspace-bootstrap-data";
import { isDbUnreachable } from "@/lib/db-errors";
import {
  isRequestCircuitOpen,
  recordRequestFailure,
} from "@/lib/request-circuit";
import { analyticsFiltersSchema } from "@/lib/validators/money";

const TRANSACTIONS_PAGE_SIZE = 20;

function recordSeedDbFailure(error: unknown): void {
  if (isDbUnreachable(error)) recordRequestFailure();
}

function recordSeedSafeFailure(code: string): void {
  if (code === "db_unavailable") recordRequestFailure();
}

const MONEY_LAYOUT_DEHYDRATE_SLOTS = new Set([
  "bootstrap",
  "analyticsChartLookups",
]);

const MONEY_ANALYTICS_PAGE_DEHYDRATE_SLOTS = new Set(["analyticsAtf"]);

const loadMoneyWorkspaceState = cache((userSub: string) =>
  fetchMoneyWorkspaceStateSafe(userSub),
);

const loadMoneyBootstrap = cache(async (userSub: string) => {
  const state = await loadMoneyWorkspaceState(userSub);
  if (!state.ok) return state;
  return completeMoneyBootstrapFromState(state.data);
});

function dehydrateMoneyQuerySlots(
  queryClient: QueryClient,
  slots: ReadonlySet<string>,
) {
  return dehydrate(queryClient, {
    shouldDehydrateQuery: (query) => {
      if (!defaultShouldDehydrateQuery(query)) return false;
      const slot = query.queryKey[1];
      return typeof slot === "string" && slots.has(slot);
    },
  });
}

/** Bootstrap + chart lookups only — page seeds stay in the nested boundary. */
export function dehydrateMoneyLayoutState(queryClient: QueryClient) {
  return dehydrateMoneyQuerySlots(queryClient, MONEY_LAYOUT_DEHYDRATE_SLOTS);
}

/** ATF payload only — layout already hydrates bootstrap. */
export function dehydrateMoneyAnalyticsPageState(queryClient: QueryClient) {
  return dehydrateMoneyQuerySlots(
    queryClient,
    MONEY_ANALYTICS_PAGE_DEHYDRATE_SLOTS,
  );
}

export function applyMoneyBootstrapSeed(
  queryClient: QueryClient,
  boot: MoneyWorkspaceBootstrapData,
) {
  queryClient.setQueryData(moneyBootstrapQueryKey, boot);
  seedChartLookupsFromBootstrap(queryClient, boot);
}

export function seedChartLookupsFromBootstrap(
  queryClient: QueryClient,
  boot: MoneyWorkspaceBootstrapData,
) {
  if (!boot.workspaceId) return;
  const lookups: MoneyAnalyticsChartLookups = {
    moneyAccounts: boot.accounts,
    moneyCategories: boot.categories,
    moneyTags: boot.tags,
  };
  queryClient.setQueryData(
    moneyAnalyticsChartLookupsQueryOptions(boot.workspaceId).queryKey,
    lookups,
  );
}

export function applyMoneyAnalyticsAtfSeed(
  queryClient: QueryClient,
  workspaceId: string,
  filterQuery: string,
  payloads: MoneyAnalyticsAtfPayload,
) {
  const atf: MoneyAnalyticsAtfQueryResult = {
    moneyAnalyticsAtf: payloads,
  };
  const summary: MoneyAnalyticsSummaryQueryResult = {
    moneyAnalyticsSummary: payloads.summary,
  };

  queryClient.setQueryData(
    moneyAnalyticsAtfQueryOptions(workspaceId, filterQuery).queryKey,
    atf,
  );
  queryClient.setQueryData(
    moneyAnalyticsSummaryQueryOptions(workspaceId, filterQuery).queryKey,
    summary,
  );
}

function parseAnalyticsFilters(filterQuery: string) {
  const raw = filterQueryToGraphQLAnalyticsInput(filterQuery);
  const parsed = analyticsFiltersSchema.safeParse({
    from: raw.from ?? undefined,
    to: raw.to ?? undefined,
    accountIds: raw.accountIds ?? undefined,
    accountTypes: raw.accountTypes ?? undefined,
    excludeAccountTypes: raw.excludeAccountTypes ?? undefined,
    categoryIds: raw.categoryIds ?? undefined,
    merchantIds: raw.merchantIds ?? undefined,
    tagIds: raw.tagIds ?? undefined,
    kinds: raw.kinds ?? undefined,
    recurrence: raw.recurrence ?? undefined,
    recurrenceSourceIds: raw.recurrenceSourceIds ?? undefined,
  });
  return parsed.success ? parsed.data : null;
}

export async function seedMoneyBootstrap(
  queryClient: QueryClient,
  userSub: string,
): Promise<MoneyWorkspaceBootstrapData | undefined> {
  if (isRequestCircuitOpen()) return undefined;
  try {
    const result = await loadMoneyBootstrap(userSub);
    if (!result.ok) {
      recordSeedSafeFailure(result.code);
      return undefined;
    }
    applyMoneyBootstrapSeed(queryClient, result.data);
    return result.data;
  } catch (error) {
    recordSeedDbFailure(error);
    return undefined;
  }
}

export async function seedMoneyAnalyticsAtf(
  queryClient: QueryClient,
  workspaceId: string,
  filterQuery: string,
): Promise<void> {
  const filters = parseAnalyticsFilters(filterQuery);
  if (!filters) return;

  try {
    await runInWorkspace(workspaceId, async () => {
      const atf = await computeMoneyAnalyticsAtf(workspaceId, filters);
      applyMoneyAnalyticsAtfSeed(queryClient, workspaceId, filterQuery, atf);
    });
  } catch {
    // Page still renders; client GraphQL fills in.
  }
}

export async function seedMoneyLedgerPage(
  queryClient: QueryClient,
  userSub: string,
  preset: MoneyLedgerPreset,
  options?: { includeSummary?: boolean },
): Promise<void> {
  const boot = await seedMoneyBootstrap(queryClient, userSub);
  if (!boot?.workspaceId) return;

  const filterQuery = moneyLedgerFirstLoadFilterQuery(
    preset,
    boot.accounts,
    boot.categories,
  );
  const listInput = moneyTransactionsListQueryInput(
    filterQuery,
    1,
    TRANSACTIONS_PAGE_SIZE,
    "occurredAt",
    "desc",
  );

  try {
    const list = await runInWorkspace(boot.workspaceId, () =>
      listMoneyTransactions(boot.workspaceId, listInput),
    );
    queryClient.setQueryData<MoneyTransactionsListResponse>(
      moneyTransactionsQueryOptions(
        boot.workspaceId,
        filterQuery,
        1,
        TRANSACTIONS_PAGE_SIZE,
        "occurredAt",
        "desc",
      ).queryKey,
      {
        data: list.data.map((row) => ({
          id: row.id,
          accountId: row.accountId,
          kind: row.kind as MoneyTransactionsListResponse["data"][number]["kind"],
          amountMinor: row.amountMinor,
          occurredAt: row.occurredAt,
          categoryId: row.categoryId,
          merchantId: row.merchantId,
          notes: row.notes,
          tagIds: row.tagIds,
          excludeFromAnalyticsAndBudget: row.excludeFromAnalyticsAndBudget,
        })),
        total: list.total,
        page: list.page,
        pageSize: list.pageSize,
      },
    );
  } catch {
    // Client GraphQL fills in.
  }

  if (!options?.includeSummary) return;

  const filters = parseAnalyticsFilters(filterQuery);
  if (!filters) return;

  try {
    const summary = await runInWorkspace(boot.workspaceId, () =>
      computeMoneyAnalyticsSummary(boot.workspaceId, filters),
    );
    const payload: MoneyAnalyticsSummaryQueryResult = {
      moneyAnalyticsSummary: summary,
    };
    queryClient.setQueryData(
      moneyAnalyticsSummaryQueryOptions(boot.workspaceId, filterQuery).queryKey,
      payload,
    );
  } catch {
    // Client GraphQL fills in.
  }
}

export async function seedMoneyAnalyticsPage(
  queryClient: QueryClient,
  userSub: string,
): Promise<void> {
  const state = await loadMoneyWorkspaceState(userSub);
  if (!state.ok || !state.data.workspaceId) return;

  await Promise.all([
    seedMoneyBootstrap(queryClient, userSub),
    seedMoneyAnalyticsAtf(
      queryClient,
      state.data.workspaceId,
      moneyDefaultMonthFilterQuery(),
    ),
  ]);
}

export async function seedMoneyLoansHome(
  queryClient: QueryClient,
  userSub: string,
): Promise<void> {
  await Promise.all([
    seedMoneyBootstrap(queryClient, userSub),
    seedLoansQueries(queryClient, userSub),
  ]);
}

async function seedLoansQueries(queryClient: QueryClient, userSub: string) {
  if (isRequestCircuitOpen()) return;
  try {
    const result = await fetchLoansBootstrapSafe(userSub);
    if (!result.ok) {
      recordSeedSafeFailure(result.code);
      return;
    }
    const boot: LoansBootstrapData = result.data;
    queryClient.setQueryData(loansKeys.bootstrap(), boot);
    const list = await runInWorkspace(boot.workspaceId, () =>
      listLoans({ userSub, workspaceId: boot.workspaceId }),
    );
    queryClient.setQueryData<LoanListItem[]>(loansKeys.list(), list);
  } catch (error) {
    recordSeedDbFailure(error);
  }
}

export async function seedMoneyInvestmentsHome(
  queryClient: QueryClient,
  userSub: string,
): Promise<void> {
  const range = investmentDefaultChartRange(6);
  await Promise.all([
    seedMoneyBootstrap(queryClient, userSub),
    seedInvestmentQueries(queryClient, userSub, range.from, range.to),
  ]);
}

async function seedInvestmentQueries(
  queryClient: QueryClient,
  userSub: string,
  from: string,
  to: string,
) {
  if (isRequestCircuitOpen()) return;
  try {
    const result = await fetchInvestmentBootstrapSafe(userSub);
    if (!result.ok) {
      recordSeedSafeFailure(result.code);
      return;
    }
    const boot: InvestmentBootstrapData = result.data;
    queryClient.setQueryData(investmentKeys.bootstrap(), boot);
    const [holdings, series, openActivities] = await runInWorkspace(
      boot.workspaceId,
      () =>
        Promise.all([
          investmentHoldingsSnapshot(boot.workspaceId),
          investmentPortfolioValueSeries(boot.workspaceId, from, to),
          listOpenInvestmentActivities(boot.workspaceId),
        ]),
    );
    queryClient.setQueryData<InvestmentHoldingRow[]>(
      investmentKeys.holdings(),
      holdings,
    );
    queryClient.setQueryData<InvestmentPortfolioPoint[]>(
      investmentKeys.portfolioSeries(from, to),
      series,
    );
    queryClient.setQueryData<InvestmentActivityRow[]>(
      investmentKeys.openActivities(),
      openActivities,
    );
  } catch (error) {
    recordSeedDbFailure(error);
  }
}

export async function seedLoansBootstrapOnly(
  queryClient: QueryClient,
  userSub: string,
): Promise<void> {
  if (isRequestCircuitOpen()) return;
  try {
    const result = await fetchLoansBootstrapSafe(userSub);
    if (!result.ok) {
      recordSeedSafeFailure(result.code);
      return;
    }
    queryClient.setQueryData(loansKeys.bootstrap(), result.data);
  } catch (error) {
    recordSeedDbFailure(error);
  }
}

export async function seedInvestmentBootstrapOnly(
  queryClient: QueryClient,
  userSub: string,
): Promise<void> {
  if (isRequestCircuitOpen()) return;
  try {
    const result = await fetchInvestmentBootstrapSafe(userSub);
    if (!result.ok) {
      recordSeedSafeFailure(result.code);
      return;
    }
    queryClient.setQueryData(investmentKeys.bootstrap(), result.data);
  } catch (error) {
    recordSeedDbFailure(error);
  }
}
