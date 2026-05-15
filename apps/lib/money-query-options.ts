"use client";

import { queryOptions } from "@tanstack/react-query";
import type { AnalyticsFiltersValue } from "@/components/analytics-filters";
import { defaultAnalyticsFilters } from "@/components/analytics-filters";
import { dateRangeParams } from "@/lib/analytics-build-query";
import { analyticsFiltersToGraphQLInput } from "@/lib/analytics-graphql-filters";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_ANALYTICS_PAGE_QUERY,
  MONEY_BOOTSTRAP_QUERY,
} from "@/lib/money-gql-documents";
import type { MoneyAnalyticsPayload } from "@/lib/money-services/analytics";
import type { AnalyticsBudgetRow } from "@/components/analytics-budgets-section";
import type { MoneyWorkspaceBootstrapData } from "@/lib/money-workspace-bootstrap-data";

export function moneyBootstrapQueryOptions() {
  return queryOptions({
    queryKey: ["money", "bootstrap"] as const,
    queryFn: async () => {
      const res = await moneyGraphQLRequest<{
        moneyBootstrap: MoneyWorkspaceBootstrapData;
      }>(MONEY_BOOTSTRAP_QUERY);
      return res.moneyBootstrap;
    },
  });
}

export type MoneyAnalyticsPageQueryResult = {
  moneyAnalytics: MoneyAnalyticsPayload;
  moneyBudgets: AnalyticsBudgetRow[];
};

export function moneyAnalyticsPageQueryOptions(
  workspaceKey: string,
  applied: AnalyticsFiltersValue,
) {
  const appliedKey = JSON.stringify(applied);
  const filters = analyticsFiltersToGraphQLInput(applied);

  const defaultDates = defaultAnalyticsFilters();
  const fromDate = applied.fromDate || defaultDates.fromDate;
  const toDate = applied.toDate || defaultDates.toDate;
  const { from, to } = dateRangeParams(fromDate, toDate);

  return queryOptions({
    queryKey: ["money", "analyticsPage", workspaceKey, appliedKey] as const,
    queryFn: async () => {
      const res = await moneyGraphQLRequest<MoneyAnalyticsPageQueryResult>(
        MONEY_ANALYTICS_PAGE_QUERY,
        {
          filters,
          includeSpent: true,
          budgetFrom: from,
          budgetTo: to,
        },
      );
      return res;
    },
    placeholderData: (previousData) => previousData,
  });
}
