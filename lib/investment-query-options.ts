import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { investmentGraphQLRequest } from "@/lib/investment-gql-client";
import { gqlMinor } from "@/lib/gql-minor";
import {
  INVESTMENT_ACTIVITIES_QUERY,
  INVESTMENT_BOOTSTRAP_QUERY,
  INVESTMENT_FX_RATE_QUERY,
  INVESTMENT_HOLDINGS_QUERY,
  INVESTMENT_INSIGHTS_ATF_QUERY,
  INVESTMENT_INSIGHTS_MORE_QUERY,
  INVESTMENT_INSTRUMENTS_QUERY,
  INVESTMENT_OPEN_ACTIVITIES_QUERY,
  INVESTMENT_PORTFOLIO_SERIES_QUERY,
  INVESTMENT_TOP_QUANTITIES_QUERY,
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

export type InvestmentTopQuantityLookup = {
  quantity: string;
  usageCount?: number;
};

export type InvestmentActivitiesQueryInput = {
  instrumentId?: string;
  kind?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
};

export type InvestmentInsightsAtf = {
  range: { from: string; to: string };
  summary: {
    resultsMinor: number;
    openNotionalMinor: number;
    realizedPnlMinor: number;
    openLotsCount: number;
  };
  series: InvestmentPortfolioPoint[];
  allocation: Array<{ label: string; kind?: string | null; valueMinor: number }>;
};

export type InvestmentInsightsMore = {
  realizedMinor: number;
  unrealizedMinor: number;
  maxDrawdownMinor: number;
  closedCount: number;
  winningClosedCount: number;
  pnlBySymbol: Array<{ symbol: string; label: string; valueMinor: number }>;
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
  topQuantities: () => [...investmentKeys.all, "topQuantities"] as const,
  insightsAtf: (from: string, to: string) =>
    [...investmentKeys.all, "insightsAtf", from, to] as const,
  insightsMore: (from: string, to: string) =>
    [...investmentKeys.all, "insightsMore", from, to] as const,
  fxRate: (from: string, to: string) =>
    [...investmentKeys.all, "fxRate", from, to] as const,
};

export async function invalidateInvestmentWorkspaceQueries(
  queryClient: QueryClient,
) {
  await queryClient.invalidateQueries({
    queryKey: investmentKeys.all,
    refetchType: "all",
  });
}

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
    staleTime: 0,
    refetchOnMount: "always" as const,
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
    staleTime: 0,
    refetchOnMount: "always" as const,
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

export function investmentTopQuantitiesQueryOptions() {
  return queryOptions({
    queryKey: investmentKeys.topQuantities(),
    queryFn: async () => {
      const data = await investmentGraphQLRequest<{
        investmentTopQuantities: InvestmentTopQuantityLookup[];
      }>(INVESTMENT_TOP_QUANTITIES_QUERY);
      return data.investmentTopQuantities;
    },
    staleTime: 60_000,
  });
}

export function investmentInsightsAtfQueryOptions(from: string, to: string) {
  return queryOptions({
    queryKey: investmentKeys.insightsAtf(from, to),
    staleTime: 0,
    refetchOnMount: "always" as const,
    queryFn: async () => {
      const data = await investmentGraphQLRequest<{
        investmentInsightsAtf: {
          range: { from: string; to: string };
          summary: {
            resultsMinor: unknown;
            openNotionalMinor: unknown;
            realizedPnlMinor: unknown;
            openLotsCount: number;
          };
          series: Array<{ date: string; totalMinor: unknown }>;
          allocation: Array<{
            label: string;
            kind?: string | null;
            valueMinor: unknown;
          }>;
        };
      }>(INVESTMENT_INSIGHTS_ATF_QUERY, { from, to });
      const atf = data.investmentInsightsAtf;
      return {
        range: atf.range,
        summary: {
          resultsMinor: gqlMinor(atf.summary.resultsMinor),
          openNotionalMinor: gqlMinor(atf.summary.openNotionalMinor),
          realizedPnlMinor: gqlMinor(atf.summary.realizedPnlMinor),
          openLotsCount: atf.summary.openLotsCount,
        },
        series: atf.series.map((row) => ({
          date: row.date,
          totalMinor: gqlMinor(row.totalMinor),
        })),
        allocation: atf.allocation.map((row) => ({
          label: row.label,
          kind: row.kind,
          valueMinor: gqlMinor(row.valueMinor),
        })),
      } satisfies InvestmentInsightsAtf;
    },
  });
}

export function investmentInsightsMoreQueryOptions(from: string, to: string) {
  return queryOptions({
    queryKey: investmentKeys.insightsMore(from, to),
    staleTime: 0,
    queryFn: async () => {
      const data = await investmentGraphQLRequest<{
        investmentInsightsMore: {
          realizedMinor: unknown;
          unrealizedMinor: unknown;
          maxDrawdownMinor: unknown;
          closedCount: number;
          winningClosedCount: number;
          pnlBySymbol: Array<{
            symbol: string;
            label: string;
            valueMinor: unknown;
          }>;
        };
      }>(INVESTMENT_INSIGHTS_MORE_QUERY, { from, to });
      const more = data.investmentInsightsMore;
      return {
        realizedMinor: gqlMinor(more.realizedMinor),
        unrealizedMinor: gqlMinor(more.unrealizedMinor),
        maxDrawdownMinor: gqlMinor(more.maxDrawdownMinor),
        closedCount: more.closedCount,
        winningClosedCount: more.winningClosedCount,
        pnlBySymbol: more.pnlBySymbol.map((row) => ({
          symbol: row.symbol,
          label: row.label,
          valueMinor: gqlMinor(row.valueMinor),
        })),
      } satisfies InvestmentInsightsMore;
    },
  });
}
