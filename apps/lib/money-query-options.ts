"use client";

import { queryOptions, type QueryClient } from "@tanstack/react-query";
import type { AnalyticsFiltersValue } from "@/components/analytics-filters";
import { analyticsFiltersToGraphQLInput } from "@/lib/analytics-graphql-filters";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_ANALYTICS_BREAKDOWN_QUERY,
  MONEY_ANALYTICS_OVERVIEW_QUERY,
  MONEY_BOOTSTRAP_QUERY,
  MONEY_FORM_LOOKUPS_QUERY,
  MONEY_WORKSPACE_STATE_QUERY,
} from "@/lib/money-gql-documents";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";
import type {
  MoneyAnalyticsBreakdownPayload,
  MoneyAnalyticsOverviewPayload,
} from "@/lib/money-services/analytics";
import type {
  MoneyWorkspaceBootstrapData,
  MoneyWorkspaceCoreData,
} from "@/lib/money-workspace-bootstrap-data";

export type MoneyAccountLookup = {
  id: string;
  name: string;
  currency: string;
  type: string;
  balanceMinor: number;
  usageCount?: number;
};

export type MoneyMerchantLookup = { id: string; name: string; usageCount?: number };
export type MoneyCategoryLookup = MoneyCategoryRow;
export type MoneyFormLookups = {
  moneyAccounts: MoneyAccountLookup[];
  moneyCategories: MoneyCategoryLookup[];
  moneyMerchants: MoneyMerchantLookup[];
};

export const moneyRootQueryKey = ["money"] as const;
export const moneyBootstrapQueryKey = ["money", "bootstrap"] as const;
export const moneyWorkspaceStateQueryKey = ["money", "workspaceState"] as const;
export const moneyFormLookupsQueryKey = ["money", "formLookups"] as const;

export async function invalidateMoneyWorkspaceQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: moneyRootQueryKey });
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
  });
}

export function moneyFormLookupsQueryOptions() {
  return queryOptions({
    queryKey: moneyFormLookupsQueryKey,
    queryFn: async () => {
      return await moneyGraphQLRequest<MoneyFormLookups>(MONEY_FORM_LOOKUPS_QUERY);
    },
  });
}

function analyticsQueryVariables(applied: AnalyticsFiltersValue) {
  return {
    appliedKey: JSON.stringify(applied),
    filters: analyticsFiltersToGraphQLInput(applied),
  };
}

export type MoneyAnalyticsOverviewQueryResult = {
  moneyAnalyticsOverview: MoneyAnalyticsOverviewPayload;
};

export type MoneyAnalyticsBreakdownQueryResult = {
  moneyAnalyticsBreakdown: MoneyAnalyticsBreakdownPayload;
};

export function moneyAnalyticsOverviewQueryOptions(
  workspaceKey: string,
  applied: AnalyticsFiltersValue,
) {
  const { appliedKey, filters } = analyticsQueryVariables(applied);

  return queryOptions({
    queryKey: ["money", "analyticsOverview", workspaceKey, appliedKey] as const,
    queryFn: async () => {
      const res = await moneyGraphQLRequest<MoneyAnalyticsOverviewQueryResult>(
        MONEY_ANALYTICS_OVERVIEW_QUERY,
        { filters },
      );
      return res;
    },
    placeholderData: (previousData) => previousData,
  });
}

export function moneyAnalyticsBreakdownQueryOptions(
  workspaceKey: string,
  applied: AnalyticsFiltersValue,
) {
  const { appliedKey, filters } = analyticsQueryVariables(applied);

  return queryOptions({
    queryKey: ["money", "analyticsBreakdown", workspaceKey, appliedKey] as const,
    queryFn: async () => {
      const res = await moneyGraphQLRequest<MoneyAnalyticsBreakdownQueryResult>(
        MONEY_ANALYTICS_BREAKDOWN_QUERY,
        { filters },
      );
      return res;
    },
    placeholderData: (previousData) => previousData,
  });
}
