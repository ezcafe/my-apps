"use client";

import { queryOptions, type QueryClient } from "@tanstack/react-query";
import type { AnalyticsFiltersValue } from "@/components/analytics-filters";
import {
  analyticsFiltersQueryKey,
  analyticsFiltersToGraphQLInput,
} from "@/lib/analytics-graphql-filters";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_ANALYTICS_BUDGETS_QUERY,
  MONEY_ANALYTICS_CHART_LOOKUPS_QUERY,
  MONEY_ANALYTICS_DISTRIBUTION_QUERY,
  MONEY_ANALYTICS_LEADERS_QUERY,
  MONEY_ANALYTICS_MERCHANT_LOOKUPS_QUERY,
  MONEY_ANALYTICS_DASHBOARD_QUERY,
  MONEY_ANALYTICS_OVERVIEW_QUERY,
  MONEY_ANALYTICS_SUMMARY_QUERY,
  MONEY_ANALYTICS_SANKEY_QUERY,
  MONEY_BOOTSTRAP_QUERY,
  MONEY_CATEGORY_BUDGET_STATUS_QUERY,
  MONEY_FORM_LOOKUPS_QUERY,
  MONEY_LIST_RECURRENCE_QUERY,
  MONEY_TRANSACTIONS_QUERY,
  MONEY_WORKSPACE_STATE_QUERY,
} from "@/lib/money-gql-documents";
import type { CategoryBudgetStatusRow } from "@/lib/money-category-budget-status";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";
import type {
  MoneyAnalyticsBudgetPayload,
  MoneyAnalyticsDistributionPayload,
  MoneyAnalyticsLeadersPayload,
  MoneyAnalyticsOverviewPayload,
  MoneyAnalyticsSummaryPayload,
  MoneyAnalyticsSankeyPayload,
} from "@/lib/money-services/analytics";
import type {
  MoneyWorkspaceBootstrapData,
  MoneyWorkspaceCoreData,
} from "@/lib/money-workspace-bootstrap-data";
import type { TransactionListSortKey } from "@/lib/validators/money";

export type MoneyAccountLookup = {
  id: string;
  name: string;
  currency: string;
  type: string;
  balanceMinor: number;
  usageCount?: number;
};

export type MoneyMerchantLookup = { id: string; name: string; usageCount?: number };
export type MoneyTopAmountLookup = { amountMinor: number; usageCount?: number };
export type MoneyTagLookup = { id: string; name: string };
export type MoneyCategoryLookup = MoneyCategoryRow;
export type MoneyFormLookups = {
  moneyAccounts: MoneyAccountLookup[];
  moneyCategories: MoneyCategoryLookup[];
  moneyMerchants: MoneyMerchantLookup[];
  moneyTopAmounts: MoneyTopAmountLookup[];
};
export type MoneyAnalyticsChartLookups = {
  moneyAccounts: MoneyAccountLookup[];
  moneyCategories: MoneyCategoryLookup[];
  moneyTags: MoneyTagLookup[];
};
export type MoneyAnalyticsMerchantLookups = {
  moneyMerchants: MoneyMerchantLookup[];
};
export type MoneyAnalyticsRecurrenceLookups = {
  moneyRecurrenceTemplates: MoneyRecurrenceLookup[];
};

export type MoneyRecurrenceLookup = {
  id: string;
  name: string;
};

export type MoneyTransactionListRow = {
  id: string;
  accountId: string;
  kind: "expense" | "income" | "transfer";
  amountMinor: number;
  occurredAt: string;
  categoryId: string | null;
  merchantId: string | null;
  notes: string | null;
  tagIds: string[];
};

export type MoneyTransactionsListResponse = {
  data: MoneyTransactionListRow[];
  total: number;
  page: number;
  pageSize: number;
};

export const moneyRootQueryKey = ["money"] as const;
export const moneyBootstrapQueryKey = ["money", "bootstrap"] as const;
export const moneyWorkspaceStateQueryKey = ["money", "workspaceState"] as const;
export const moneyFormLookupsQueryKey = ["money", "formLookups"] as const;
export const moneyCategoryBudgetStatusQueryKey = [
  "money",
  "categoryBudgetStatus",
] as const;

export async function invalidateMoneyWorkspaceQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: moneyRootQueryKey });
}

/** Refetch category budget utilization after posting an expense (bypasses stale client cache). */
export async function refetchMoneyCategoryBudgetStatus(
  queryClient: QueryClient,
  workspaceKey?: string,
) {
  await queryClient.refetchQueries({
    queryKey: workspaceKey
      ? ([...moneyCategoryBudgetStatusQueryKey, workspaceKey] as const)
      : moneyCategoryBudgetStatusQueryKey,
    type: "active",
  });
}

export function moneyBootstrapQueryOptions() {
  return queryOptions({
    queryKey: moneyBootstrapQueryKey,
    queryFn: async () => {
      const res = await moneyGraphQLRequest<{
        moneyBootstrap: MoneyWorkspaceBootstrapData;
      }>(MONEY_BOOTSTRAP_QUERY);
      return res.moneyBootstrap;
    },
    staleTime: 5 * 60_000,
  });
}

export function moneyWorkspaceStateQueryOptions() {
  return queryOptions({
    queryKey: moneyWorkspaceStateQueryKey,
    queryFn: async () => {
      const res = await moneyGraphQLRequest<{
        moneyWorkspaceState: MoneyWorkspaceCoreData;
      }>(MONEY_WORKSPACE_STATE_QUERY);
      return res.moneyWorkspaceState;
    },
    staleTime: 60_000,
  });
}

export function moneyFormLookupsQueryOptions() {
  return queryOptions({
    queryKey: moneyFormLookupsQueryKey,
    queryFn: async () => {
      return await moneyGraphQLRequest<MoneyFormLookups>(MONEY_FORM_LOOKUPS_QUERY);
    },
    staleTime: 5 * 60_000,
  });
}

export function moneyCategoryBudgetStatusQueryOptions(
  workspaceKey: string,
  monthKey: string,
  from: string,
  to: string,
) {
  return queryOptions({
    queryKey: [
      ...moneyCategoryBudgetStatusQueryKey,
      workspaceKey,
      monthKey,
    ] as const,
    queryFn: async () => {
      const res = await moneyGraphQLRequest<{
        moneyCategoryBudgetStatus: CategoryBudgetStatusRow[];
      }>(MONEY_CATEGORY_BUDGET_STATUS_QUERY, { from, to });
      return res.moneyCategoryBudgetStatus;
    },
    select: (rows) =>
      new Map(rows.map((r) => [r.categoryId, r.progressPct] as const)),
    staleTime: 60_000,
  });
}

export function moneyAnalyticsChartLookupsQueryOptions(workspaceKey: string) {
  return queryOptions({
    queryKey: ["money", "analyticsChartLookups", workspaceKey] as const,
    queryFn: async () => {
      return await moneyGraphQLRequest<MoneyAnalyticsChartLookups>(
        MONEY_ANALYTICS_CHART_LOOKUPS_QUERY,
      );
    },
    staleTime: 5 * 60_000,
  });
}

export function moneyAnalyticsMerchantLookupsQueryOptions(workspaceKey: string) {
  return queryOptions({
    queryKey: ["money", "analyticsMerchantLookups", workspaceKey] as const,
    queryFn: async () => {
      return await moneyGraphQLRequest<MoneyAnalyticsMerchantLookups>(
        MONEY_ANALYTICS_MERCHANT_LOOKUPS_QUERY,
      );
    },
    staleTime: 5 * 60_000,
  });
}

export function moneyAnalyticsRecurrenceLookupsQueryOptions(workspaceKey: string) {
  return queryOptions({
    queryKey: ["money", "analyticsRecurrenceLookups", workspaceKey] as const,
    queryFn: async () => {
      return await moneyGraphQLRequest<MoneyAnalyticsRecurrenceLookups>(
        MONEY_LIST_RECURRENCE_QUERY,
      );
    },
    staleTime: 5 * 60_000,
  });
}

export type MoneyAnalyticsOverviewQueryResult = {
  moneyAnalyticsOverview: MoneyAnalyticsOverviewPayload;
};

export type MoneyAnalyticsSummaryQueryResult = {
  moneyAnalyticsSummary: MoneyAnalyticsSummaryPayload;
};

export type MoneyAnalyticsDashboardQueryResult = {
  moneyAnalyticsSummary: MoneyAnalyticsSummaryPayload;
  moneyAnalyticsOverview: MoneyAnalyticsOverviewPayload;
};

export type MoneyAnalyticsDistributionQueryResult = {
  moneyAnalyticsDistribution: MoneyAnalyticsDistributionPayload;
};

export type MoneyAnalyticsBudgetQueryResult = {
  moneyAnalyticsBudgets: MoneyAnalyticsBudgetPayload;
};

export type MoneyAnalyticsSankeyQueryResult = {
  moneyAnalyticsSankey: MoneyAnalyticsSankeyPayload;
};

export type MoneyAnalyticsLeadersQueryResult = {
  moneyAnalyticsLeaders: MoneyAnalyticsLeadersPayload;
};

export function moneyAnalyticsSummaryQueryOptions(
  workspaceKey: string,
  applied: AnalyticsFiltersValue,
) {
  const filters = analyticsFiltersToGraphQLInput(applied);

  return queryOptions({
    queryKey: [
      "money",
      "analyticsSummary",
      workspaceKey,
      ...analyticsFiltersQueryKey(applied),
    ] as const,
    queryFn: async () => {
      const res = await moneyGraphQLRequest<MoneyAnalyticsSummaryQueryResult>(
        MONEY_ANALYTICS_SUMMARY_QUERY,
        { filters },
      );
      return res;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 45_000,
  });
}

export function moneyAnalyticsDashboardQueryOptions(
  workspaceKey: string,
  applied: AnalyticsFiltersValue,
) {
  const filters = analyticsFiltersToGraphQLInput(applied);

  return queryOptions({
    queryKey: [
      "money",
      "analyticsDashboard",
      workspaceKey,
      ...analyticsFiltersQueryKey(applied),
    ] as const,
    queryFn: async () => {
      const res = await moneyGraphQLRequest<MoneyAnalyticsDashboardQueryResult>(
        MONEY_ANALYTICS_DASHBOARD_QUERY,
        { filters },
      );
      return res;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 20_000,
  });
}

export function moneyAnalyticsOverviewQueryOptions(
  workspaceKey: string,
  applied: AnalyticsFiltersValue,
) {
  const filters = analyticsFiltersToGraphQLInput(applied);

  return queryOptions({
    queryKey: [
      "money",
      "analyticsOverview",
      workspaceKey,
      ...analyticsFiltersQueryKey(applied),
    ] as const,
    queryFn: async () => {
      const res = await moneyGraphQLRequest<MoneyAnalyticsOverviewQueryResult>(
        MONEY_ANALYTICS_OVERVIEW_QUERY,
        { filters },
      );
      return res;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 20_000,
  });
}

export function moneyAnalyticsDistributionQueryOptions(
  workspaceKey: string,
  applied: AnalyticsFiltersValue,
) {
  const filters = analyticsFiltersToGraphQLInput(applied);

  return queryOptions({
    queryKey: [
      "money",
      "analyticsDistribution",
      workspaceKey,
      ...analyticsFiltersQueryKey(applied),
    ] as const,
    queryFn: async () => {
      const res = await moneyGraphQLRequest<MoneyAnalyticsDistributionQueryResult>(
        MONEY_ANALYTICS_DISTRIBUTION_QUERY,
        { filters },
      );
      return res;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });
}

export function moneyAnalyticsBudgetsQueryOptions(
  workspaceKey: string,
  applied: AnalyticsFiltersValue,
) {
  const filters = analyticsFiltersToGraphQLInput(applied);

  return queryOptions({
    queryKey: [
      "money",
      "analyticsBudgets",
      workspaceKey,
      ...analyticsFiltersQueryKey(applied),
    ] as const,
    queryFn: async () => {
      const res = await moneyGraphQLRequest<MoneyAnalyticsBudgetQueryResult>(
        MONEY_ANALYTICS_BUDGETS_QUERY,
        { filters },
      );
      return res;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });
}

export function moneyAnalyticsSankeyQueryOptions(
  workspaceKey: string,
  applied: AnalyticsFiltersValue,
) {
  const filters = analyticsFiltersToGraphQLInput(applied);

  return queryOptions({
    queryKey: [
      "money",
      "analyticsSankey",
      workspaceKey,
      ...analyticsFiltersQueryKey(applied),
    ] as const,
    queryFn: async () => {
      const res = await moneyGraphQLRequest<MoneyAnalyticsSankeyQueryResult>(
        MONEY_ANALYTICS_SANKEY_QUERY,
        { filters },
      );
      return res;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });
}

export function moneyAnalyticsLeadersQueryOptions(
  workspaceKey: string,
  applied: AnalyticsFiltersValue,
) {
  const filters = analyticsFiltersToGraphQLInput(applied);

  return queryOptions({
    queryKey: [
      "money",
      "analyticsLeaders",
      workspaceKey,
      ...analyticsFiltersQueryKey(applied),
    ] as const,
    queryFn: async () => {
      const res = await moneyGraphQLRequest<MoneyAnalyticsLeadersQueryResult>(
        MONEY_ANALYTICS_LEADERS_QUERY,
        { filters },
      );
      return res;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });
}

function analyticsTransactionsQueryObject(
  filterQuery: string,
  page: number,
  pageSize: number,
  sort: TransactionListSortKey,
  dir: "asc" | "desc",
): Record<string, unknown> {
  const params = new URLSearchParams(filterQuery);
  const query: Record<string, unknown> = {
    page,
    pageSize,
    sort,
    dir,
  };
  const from = params.get("from");
  const to = params.get("to");
  if (from) query.from = from;
  if (to) query.to = to;
  for (const key of [
    "accountIds",
    "categoryIds",
    "merchantIds",
    "tagIds",
    "kinds",
    "recurrenceSourceIds",
  ] as const) {
    const all = params.getAll(key);
    if (all.length > 0) query[key] = all;
  }
  const recurrence = params.get("recurrence");
  if (recurrence === "recurring" || recurrence === "one-time") {
    query.recurrence = recurrence;
  }
  return query;
}

export function moneyTransactionsQueryOptions(
  workspaceKey: string,
  filterQuery: string,
  page: number,
  pageSize: number,
  sort: TransactionListSortKey,
  dir: "asc" | "desc",
) {
  return queryOptions({
    queryKey: [
      "money",
      "transactions",
      workspaceKey,
      filterQuery,
      page,
      pageSize,
      sort,
      dir,
    ] as const,
    queryFn: async () => {
      const res = await moneyGraphQLRequest<{
        moneyTransactions: MoneyTransactionsListResponse;
      }>(MONEY_TRANSACTIONS_QUERY, {
        query: analyticsTransactionsQueryObject(
          filterQuery,
          page,
          pageSize,
          sort,
          dir,
        ),
      });
      return res.moneyTransactions;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 15_000,
  });
}
