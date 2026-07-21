"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useInvestmentWorkspace } from "@/components/investment-workspace-provider";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinor } from "@/lib/format-money";
import { queryErrorMessage } from "@/lib/user-facing-error";
import {
  investmentHoldingsQueryOptions,
  investmentPortfolioSeriesQueryOptions,
} from "@/lib/investment-query-options";

const LineChart = dynamic(
  () =>
    import("@/components/charts/line-chart").then((m) => ({
      default: m.LineChart,
    })),
  { ssr: false },
);

function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function chartRange(monthsBack: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - monthsBack);
  return { from: localDateString(from), to: localDateString(to) };
}

export function InvestmentDashboard() {
  const { workspaceReady, defaultCurrency } = useInvestmentWorkspace();
  const range = useMemo(() => chartRange(6), []);

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
    <div className="col-span-2 min-w-0 space-y-6 md:col-span-6 lg:col-span-12">
      {loading ? (
        <>
          <Skeleton className="h-24 w-full max-w-md" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-48 w-full" />
        </>
      ) : null}

      {holdingsQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {queryErrorMessage(holdingsQuery.error) ?? "Could not load portfolio"}
        </p>
      ) : null}

      {holdingsQuery.isSuccess && holdingsQuery.data.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted">No holdings yet.</p>
          <Link
            href="/investment/new"
            className="mt-4 inline-block font-medium text-foreground underline-offset-2 transition-colors duration-150 hover:underline"
          >
            Record your first activity
          </Link>
        </Card>
      ) : null}

      {holdingsQuery.isSuccess && holdingsQuery.data.length > 0 ? (
        <>
          <Card className="p-5">
            <p className="text-sm text-muted">Portfolio value</p>
            <p className="mt-1 font-display text-3xl font-semibold tracking-tight">
              {formatMinor(totalMinor, defaultCurrency)}
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-lg font-medium">Value over time</h2>
            <div className="mt-3 h-56 min-h-0">
              {seriesQuery.isError ? (
                <p className="text-sm text-destructive" role="alert">
                  {queryErrorMessage(seriesQuery.error) ?? "Could not load chart"}
                </p>
              ) : lineData.length > 0 ? (
                <LineChart
                  data={lineData}
                  formatY={(minor) => formatMinor(minor, defaultCurrency)}
                  animate
                />
              ) : (
                <p className="text-sm text-muted">No history in this range.</p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-medium">Holdings</h2>
              <Link
                href="/investment/activities"
                className="text-sm font-medium text-foreground underline-offset-2 transition-colors duration-150 hover:underline"
              >
                View activities
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
                  {holdingsQuery.data.map((row) => (
                    <tr key={row.instrumentId}>
                      <td className="py-2.5 pr-4 font-medium">{row.symbol}</td>
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
