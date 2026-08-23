import { queryOptions } from "@tanstack/react-query";
import { investmentGraphQLRequest } from "@/lib/investment-gql-client";
import { gqlMinor } from "@/lib/gql-minor";
import {
  INVESTMENT_ACTIVITIES_QUERY,
  INVESTMENT_BOOTSTRAP_QUERY,
  INVESTMENT_FX_RATE_QUERY,
  INVESTMENT_HOLDINGS_QUERY,
  INVESTMENT_INSTRUMENTS_QUERY,
  INVESTMENT_OPEN_ACTIVITIES_QUERY,
  INVESTMENT_PORTFOLIO_SERIES_QUERY,
} from "@/lib/investment-gql-documents";

export type InvestmentBootstrapData = {
  workspaceId: string;
  defaultCurrency: string | null;
  needsCurrencySetup: boolean;
  defaultWorkspaceId: string | null;
  instrumentCount: number;
  workspaces: Array<{
    id: string;
    name: string;
    kind: string;
    defaultCurrency: string | null;
    role: string;
    isDefault: boolean;
  }>;
};

export type InvestmentInstrument = {
  id: string;
  kind: string;
  name: string;
  currency: string;
  symbol: string;
  yahooSymbol: string | null;
  contractSize: string;
  archived: boolean;
  moneyAccountId: string | null;
  incomeCategoryId: string | null;
  expenseCategoryId: string | null;
};

export type InvestmentActivityRow = {
  id: string;
  instrumentId: string;
  instrumentName: string;
  instrumentKind: string;
  instrumentSymbol: string;
  instrumentCurrency: string;
  activityDate: string;
  type: string;
  quantity: string | null;
  unitPriceMinor: number | null;
  openPrice: string | null;
  closePrice: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
  amountMinor: number | null;
  notes: string | null;
  moneyAccountId: string | null;
  moneyTransactionId: string | null;
  status: string | null;
};

export type InvestmentPortfolioPoint = {
  date: string;
  totalMinor: number;
};

export type InvestmentHoldingRow = {
  instrumentId: string;
  kind: string;
  name: string;
  symbol: string;
  currency: string;
  quantity: number;
  priceMinor: number;
  valueMinor: number;
  quoteAsOf: string | null;
};

export type InvestmentActivitiesQueryInput = {
  instrumentId?: string;
  kind?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
};

export const investmentKeys = {
  all: ["investment"] as const,
  bootstrap: () => [...investmentKeys.all, "bootstrap"] as const,
  instruments: () => [...investmentKeys.all, "instruments"] as const,
  activities: (query?: InvestmentActivitiesQueryInput) =>
    [...investmentKeys.all, "activities", query ?? {}] as const,
  openActivities: (instrumentId?: string) =>
    [...investmentKeys.all, "openActivities", instrumentId ?? "all"] as const,
  portfolioSeries: (from: string, to: string) =>
    [...investmentKeys.all, "portfolioSeries", from, to] as const,
  holdings: () => [...investmentKeys.all, "holdings"] as const,
  fxRate: (from: string, to: string) =>
    [...investmentKeys.all, "fxRate", from, to] as const,
};

export function investmentBootstrapQueryOptions() {
  return queryOptions({
    queryKey: investmentKeys.bootstrap(),
    queryFn: async () => {
      const data = await investmentGraphQLRequest<{
        investmentBootstrap: InvestmentBootstrapData;
      }>(INVESTMENT_BOOTSTRAP_QUERY);
      return data.investmentBootstrap;
    },
  });
}

export function investmentInstrumentsQueryOptions() {
  return queryOptions({
    queryKey: investmentKeys.instruments(),
    queryFn: async () => {
      const data = await investmentGraphQLRequest<{
        investmentInstruments: InvestmentInstrument[];
      }>(INVESTMENT_INSTRUMENTS_QUERY);
      return data.investmentInstruments;
    },
  });
}

export function investmentActivitiesQueryOptions(
  query: InvestmentActivitiesQueryInput = {},
) {
  return queryOptions({
    queryKey: investmentKeys.activities(query),
    queryFn: async () => {
      const data = await investmentGraphQLRequest<{
        investmentActivities: {
          items: Array<
            Omit<
              InvestmentActivityRow,
              "unitPriceMinor" | "amountMinor"
            > & {
              unitPriceMinor: unknown;
              amountMinor: unknown;
            }
          >;
          nextCursor: string | null;
        };
      }>(INVESTMENT_ACTIVITIES_QUERY, { query });
      return {
        items: data.investmentActivities.items.map((row) => ({
          ...row,
          unitPriceMinor:
            row.unitPriceMinor == null
              ? null
              : gqlMinor(row.unitPriceMinor),
          amountMinor:
            row.amountMinor == null ? null : gqlMinor(row.amountMinor),
        })),
        nextCursor: data.investmentActivities.nextCursor,
      };
    },
  });
}

export function investmentOpenActivitiesQueryOptions(instrumentId?: string) {
  return queryOptions({
    queryKey: investmentKeys.openActivities(instrumentId),
    queryFn: async () => {
      const data = await investmentGraphQLRequest<{
        investmentOpenActivities: InvestmentActivityRow[];
      }>(INVESTMENT_OPEN_ACTIVITIES_QUERY, {
        instrumentId: instrumentId ?? null,
      });
      return data.investmentOpenActivities;
    },
  });
}

export function investmentPortfolioSeriesQueryOptions(from: string, to: string) {
  return queryOptions({
    queryKey: investmentKeys.portfolioSeries(from, to),
    queryFn: async () => {
      const data = await investmentGraphQLRequest<{
        investmentPortfolioValueSeries: Array<
          Omit<InvestmentPortfolioPoint, "totalMinor"> & { totalMinor: unknown }
        >;
      }>(INVESTMENT_PORTFOLIO_SERIES_QUERY, { from, to });
      return data.investmentPortfolioValueSeries.map((row) => ({
        date: row.date,
        totalMinor: gqlMinor(row.totalMinor),
      }));
    },
  });
}

export function investmentFxRateQueryOptions(from: string, to: string) {
  return queryOptions({
    queryKey: investmentKeys.fxRate(from, to),
    queryFn: async () => {
      const data = await investmentGraphQLRequest<{
        investmentFxRate: {
          rate: number;
          sourceSymbol: string;
          inverted: boolean;
          asOf: string;
        } | null;
      }>(INVESTMENT_FX_RATE_QUERY, { from, to });
      return data.investmentFxRate;
    },
    staleTime: 60_000,
  });
}

export function investmentHoldingsQueryOptions() {
  return queryOptions({
    queryKey: investmentKeys.holdings(),
    queryFn: async () => {
      const data = await investmentGraphQLRequest<{
        investmentHoldingsSnapshot: Array<
          Omit<InvestmentHoldingRow, "priceMinor" | "valueMinor"> & {
            priceMinor: unknown;
            valueMinor: unknown;
          }
        >;
      }>(INVESTMENT_HOLDINGS_QUERY);
      return data.investmentHoldingsSnapshot.map((row) => ({
        ...row,
        priceMinor: gqlMinor(row.priceMinor),
        valueMinor: gqlMinor(row.valueMinor),
      }));
    },
  });
}
