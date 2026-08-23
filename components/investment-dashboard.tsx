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
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowActions,
} from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { buttonClassName } from "@/components/ui/button";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import {
  investmentHoldingsQueryOptions,
  investmentOpenActivitiesQueryOptions,
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
  const { formatDate } = useFormatDate();
  const range = useMemo(() => investmentDefaultChartRange(6), []);

  const holdingsQuery = useQuery({
    ...investmentHoldingsQueryOptions(),
    enabled: workspaceReady,
  });
  const seriesQuery = useQuery({
    ...investmentPortfolioSeriesQueryOptions(range.from, range.to),
    enabled: workspaceReady,
  });
  const openQuery = useQuery({
    ...investmentOpenActivitiesQueryOptions(),
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

  const lastResultsMinor = lineData.at(-1)?.netMinor ?? 0;

  const loading = holdingsQuery.isLoading || seriesQuery.isLoading;
  const hasHoldings =
    holdingsQuery.isSuccess && holdingsQuery.data.length > 0;
  const hasOpenActivities =
    openQuery.isSuccess && openQuery.data.length > 0;
  const hasResultsSeries = lineData.some((p) => p.netMinor !== 0);
  const showEmptyPortfolio =
    holdingsQuery.isSuccess &&
    !hasHoldings &&
    openQuery.isSuccess &&
    !hasOpenActivities &&
    seriesQuery.isSuccess &&
    !hasResultsSeries;

  return (
    <div className="min-w-0 space-y-4">
      {loading ? (
        <>
          <MoneyListSkeleton
            variant="summaryTiles"
            tileCount={1}
            showAccentBar={false}
          />
          <MoneyListSkeleton variant="panelCards" />
          <MoneyListSkeleton variant="tableRows" />
        </>
      ) : null}

      {holdingsQuery.isError ? (
        <MoneyQueryErrorAlert
          title="Couldn’t load portfolio"
          error={holdingsQuery.error}
          onRetry={() => void holdingsQuery.refetch()}
        />
      ) : null}

      {showEmptyPortfolio ? (
        <MoneyEmptyState
          icon="investment"
          accentChartIndex={4}
          title="No holdings yet"
          description="Create an instrument, then open a trade from a holding or Record activity."
          minHeightClass="min-h-[200px]"
          primaryAction={{
            href: "/money/investments/new",
            label: "Record activity",
          }}
        />
      ) : null}

      {hasHoldings || hasResultsSeries ? (
        <>
          <div
            className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3"
            aria-label="Summary metrics"
          >
            <MoneyStatCard
              label={hasHoldings ? "Portfolio value" : "Results to date"}
              value={
                <AnimatedNumber
                  value={hasHoldings ? totalMinor : lastResultsMinor}
                  format={(n) => formatMinor(Math.round(n), defaultCurrency)}
                />
              }
            />
          </div>

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

          {hasHoldings ? (
          <section className="w-full min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-medium">Holdings</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead freeze="leading">Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead align="end">Volume</TableHead>
                  <TableHead align="end">Value</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(holdingsQuery.data ?? []).map((row, index) => (
                  <TableRow key={row.instrumentId}>
                    <TableCell freeze="leading">
                      <Tag
                        className={cn(
                          "font-medium",
                          HOLDING_SYMBOL_COLORS[index % 8],
                        )}
                      >
                        {row.symbol}
                      </Tag>
                    </TableCell>
                    <TableCell className="text-muted">{row.name}</TableCell>
                    <TableCell align="end" numeric>
                      {row.quantity}
                    </TableCell>
                    <TableCell align="end" numeric className="font-medium">
                      {formatMinor(row.valueMinor, row.currency)}
                    </TableCell>
                    <TableCell>
                      <TableRowActions>
                        <Link
                          href={`/money/investments/new?instrumentId=${row.instrumentId}`}
                          aria-label="Record activity"
                          className={buttonClassName({
                            variant: "secondary",
                            size: "sm",
                          })}
                        >
                          Activity
                        </Link>
                      </TableRowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
          ) : null}
        </>
      ) : null}

      {hasHoldings ||
      hasOpenActivities ||
      (holdingsQuery.isSuccess && openQuery.isPending) ? (
        <section className="w-full min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-medium">Open activities</h2>
          </div>
          {openQuery.isLoading ? (
            <MoneyListSkeleton variant="tableRows" />
          ) : null}
          {openQuery.isError ? (
            <MoneyQueryErrorAlert
              title="Couldn’t load open activities"
              error={openQuery.error}
              onRetry={() => void openQuery.refetch()}
            />
          ) : null}
          {openQuery.isSuccess && openQuery.data.length === 0 ? (
            <p className="text-sm text-muted">No open activities.</p>
          ) : null}
          {openQuery.isSuccess && openQuery.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead freeze="leading">Symbol</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead align="end">Volume</TableHead>
                  <TableHead align="end">Open price</TableHead>
                  <TableHead align="end">SL</TableHead>
                  <TableHead align="end">TP</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openQuery.data.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell freeze="leading">
                      <Tag
                        className={cn(
                          "font-medium",
                          HOLDING_SYMBOL_COLORS[index % 8],
                        )}
                      >
                        {row.instrumentSymbol}
                      </Tag>
                    </TableCell>
                    <TableCell className="capitalize">{row.type}</TableCell>
                    <TableCell align="end" numeric>
                      {row.quantity ?? "—"}
                    </TableCell>
                    <TableCell align="end" numeric>
                      {row.openPrice ?? "—"}
                    </TableCell>
                    <TableCell align="end" numeric>
                      {row.stopLoss ?? "—"}
                    </TableCell>
                    <TableCell align="end" numeric>
                      {row.takeProfit ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted">
                      {formatDate(row.activityDate, { omitYearIfCurrent: true })}
                    </TableCell>
                    <TableCell>
                      <TableRowActions>
                        <Link
                          href={`/money/investments/new?mode=close&openActivityId=${row.id}`}
                          aria-label={`Close ${row.instrumentSymbol}`}
                          className={buttonClassName({
                            variant: "secondary",
                            size: "sm",
                          })}
                        >
                          Close
                        </Link>
                      </TableRowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
