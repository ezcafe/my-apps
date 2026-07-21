import { queryOptions } from "@tanstack/react-query";
import { savingsGraphQLRequest } from "@/lib/savings-gql-client";
import {
  SAVINGS_ACCOUNTS_QUERY,
  SAVINGS_ACTIVITIES_QUERY,
  SAVINGS_BALANCE_SERIES_QUERY,
  SAVINGS_BOOTSTRAP_QUERY,
} from "@/lib/savings-gql-documents";
import { gqlMinor } from "@/lib/gql-minor";

export type SavingsBootstrapData = {
  workspaceId: string;
  defaultCurrency: string | null;
  needsCurrencySetup: boolean;
  defaultWorkspaceId: string | null;
  accountCount: number;
  workspaces: Array<{
    id: string;
    name: string;
    kind: string;
    defaultCurrency: string | null;
    role: string;
    isDefault: boolean;
  }>;
};

export type SavingsAccount = {
  id: string;
  name: string;
  currency: string;
  sortOrder: number;
  archived: boolean;
  balanceMinor: number;
};

export type SavingsActivityRow = {
  id: string;
  accountId: string;
  accountName: string;
  accountCurrency: string;
  activityDate: string;
  type: string;
  amountMinor: number;
  notes: string | null;
  moneyAccountId: string | null;
  moneyTransactionId: string | null;
};

export type SavingsBalancePoint = {
  date: string;
  totalMinor: number;
};

export type SavingsActivitiesQueryInput = {
  accountId?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
};

export const savingsKeys = {
  all: ["savings"] as const,
  bootstrap: () => [...savingsKeys.all, "bootstrap"] as const,
  accounts: () => [...savingsKeys.all, "accounts"] as const,
  activities: (query?: SavingsActivitiesQueryInput) =>
    [...savingsKeys.all, "activities", query ?? {}] as const,
  balanceSeries: (from: string, to: string) =>
    [...savingsKeys.all, "balanceSeries", from, to] as const,
};

export function savingsBootstrapQueryOptions() {
  return queryOptions({
    queryKey: savingsKeys.bootstrap(),
    queryFn: async () => {
      const data = await savingsGraphQLRequest<{
        savingsBootstrap: SavingsBootstrapData;
      }>(SAVINGS_BOOTSTRAP_QUERY);
      return data.savingsBootstrap;
    },
  });
}

export function savingsAccountsQueryOptions() {
  return queryOptions({
    queryKey: savingsKeys.accounts(),
    queryFn: async () => {
      const data = await savingsGraphQLRequest<{
        savingsAccounts: Array<
          Omit<SavingsAccount, "balanceMinor"> & { balanceMinor: unknown }
        >;
      }>(SAVINGS_ACCOUNTS_QUERY);
      return data.savingsAccounts.map((row) => ({
        ...row,
        balanceMinor: gqlMinor(row.balanceMinor),
      }));
    },
  });
}

export function savingsActivitiesQueryOptions(
  query: SavingsActivitiesQueryInput = {},
) {
  return queryOptions({
    queryKey: savingsKeys.activities(query),
    queryFn: async () => {
      const data = await savingsGraphQLRequest<{
        savingsActivities: {
          items: Array<
            Omit<SavingsActivityRow, "amountMinor"> & { amountMinor: unknown }
          >;
          nextCursor: string | null;
        };
      }>(SAVINGS_ACTIVITIES_QUERY, { query });
      return {
        items: data.savingsActivities.items.map((row) => ({
          ...row,
          amountMinor: gqlMinor(row.amountMinor),
        })),
        nextCursor: data.savingsActivities.nextCursor,
      };
    },
  });
}

export function savingsBalanceSeriesQueryOptions(from: string, to: string) {
  return queryOptions({
    queryKey: savingsKeys.balanceSeries(from, to),
    queryFn: async () => {
      const data = await savingsGraphQLRequest<{
        savingsBalanceSeries: Array<
          Omit<SavingsBalancePoint, "totalMinor"> & { totalMinor: unknown }
        >;
      }>(SAVINGS_BALANCE_SERIES_QUERY, { from, to });
      return data.savingsBalanceSeries.map((row) => ({
        date: row.date,
        totalMinor: gqlMinor(row.totalMinor),
      }));
    },
  });
}
