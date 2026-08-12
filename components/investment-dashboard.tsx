"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useInvestmentWorkspace } from "@/components/investment-workspace-provider";
import {
  MoneyEmptyState,
  MoneyListSkeleton,
  MoneyQueryErrorAlert,
  MoneyStatCard,
} from "@/components/money-feedback";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { formatMinor } from "@/lib/format-money";
import {
  investmentHoldingsQueryOptions,
  investmentPortfolioSeriesQueryOptions,
} from "@/lib/investment-query-options";
import { investmentDefaultChartRange } from "@/lib/money-first-load-filters";
import { cn } from "@/lib/cn";

const LineChart = dynamic(
  () =>
    import("@/components/charts/line-chart").then((m) => ({
      default: m.LineChart,
    })),
  { ssr: false },
);

const HOLDING_SYMBOL_COLORS = [
  "text-chart-0",
  "text-chart-1",
  "text-chart-2",
  "text-chart-3",
  "text-chart-4",
  "text-chart-5",
  "text-chart-6",
  "text-chart-7",
] as const;

export function InvestmentDashboard() {
  const { workspaceReady, defaultCurrency } = useInvestmentWorkspace();
  const range = useMemo(() => investmentDefaultChartRange(6), []);

  const holdingsQuery = useQuery({
    ...investmentHoldingsQueryOptions(),
    enabled: workspaceReady,
  });
  const seriesQuery = useQuery({
    ...investmentPortfolioSeriesQueryOptions(range.from, range.to),
    enabled: workspaceReady,
  });

  const totalMinor = useMemo(() => {
    if (!holdingsQuery.data) return 0;
    return holdingsQuery.data.reduce((sum, h) => sum + h.valueMinor, 0);
  }, [holdingsQuery.data]);

  const lineData = useMemo(
    () =>
      (seriesQuery.data ?? []).map((p) => ({
        date: p.date,
        netMinor: p.totalMinor,
      })),
    [seriesQuery.data],
  );

  const loading = holdingsQuery.isLoading || seriesQuery.isLoading;

  return (
    <div className="min-w-0 space-y-4">
      {loading ? (
        <>
          <MoneyListSkeleton
            variant="summaryTiles"
            tileCount={1}
            className="max-w-md"
          />
          <MoneyListSkeleton variant="panelCards" />
        </>
      ) : null}

      {holdingsQuery.isError ? (
        <MoneyQueryErrorAlert
          title="Couldn’t load portfolio"
          error={holdingsQuery.error}
          onRetry={() => void holdingsQuery.refetch()}
        />
      ) : null}

      {holdingsQuery.isSuccess && holdingsQuery.data.length === 0 ? (
        <MoneyEmptyState
          icon="investment"
          accentChartIndex={4}
          title="No holdings yet"
          description="Record buys, sells, and dividends to see portfolio value and history here."
          minHeightClass="min-h-[200px]"
          primaryAction={{
            href: "/money/investments/new",
            label: "Record your first activity",
          }}
        />
      ) : null}

      {holdingsQuery.isSuccess && holdingsQuery.data.length > 0 ? (
        <>
          <MoneyStatCard
            label="Portfolio value"
            value={formatMinor(totalMinor, defaultCurrency)}
            accentIndex={4}
            className="max-w-md"
          />

          <Card className="p-4">
            <h2 className="font-display text-lg font-medium">Value over time</h2>
            <div className="mt-3 h-56 min-h-0">
              {seriesQuery.isError ? (
                <MoneyQueryErrorAlert
                  title="Couldn’t load chart"
                  error={seriesQuery.error}
                  onRetry={() => void seriesQuery.refetch()}
                />
              ) : lineData.length > 0 ? (
                <LineChart
                  data={lineData}
                  formatY={(minor) => formatMinor(minor, defaultCurrency)}
                  animate
                />
              ) : (
                <p className="text-sm text-muted">
                  No history in this range yet. Add more activity to build a chart.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-medium">Holdings</h2>
              <Link
                href="/money/investments/new"
                className="text-sm font-medium text-foreground underline-offset-2 transition-colors duration-150 hover:underline"
              >
                Record activity
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left text-sm">
                <thead>
                  <tr className="text-xs text-muted">
                    <th className="pb-2 pr-4 font-medium">Symbol</th>
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium text-right">Qty</th>
                    <th className="pb-2 pr-4 font-medium text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {holdingsQuery.data.map((row, index) => (
                    <tr key={row.instrumentId}>
                      <td className="py-2.5 pr-4">
                        <Tag
                          className={cn(
                            "font-medium",
                            HOLDING_SYMBOL_COLORS[index % 8],
                          )}
                        >
                          {row.symbol}
                        </Tag>
                      </td>
                      <td className="py-2.5 pr-4 text-muted">{row.name}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {row.quantity}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums font-medium">
                        {formatMinor(row.valueMinor, row.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
