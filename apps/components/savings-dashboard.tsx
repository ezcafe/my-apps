"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSavingsWorkspace } from "@/components/savings-workspace-provider";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import { queryErrorMessage } from "@/lib/user-facing-error";
import {
  savingsAccountsQueryOptions,
  savingsActivitiesQueryOptions,
  savingsBalanceSeriesQueryOptions,
} from "@/lib/savings-query-options";

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

export function SavingsDashboard() {
  const { workspaceReady, defaultCurrency } = useSavingsWorkspace();
  const { formatDate } = useFormatDate();
  const range = useMemo(() => chartRange(6), []);

  const accountsQuery = useQuery({
    ...savingsAccountsQueryOptions(),
    enabled: workspaceReady,
  });
  const seriesQuery = useQuery({
    ...savingsBalanceSeriesQueryOptions(range.from, range.to),
    enabled: workspaceReady,
  });
  const activitiesQuery = useQuery({
    ...savingsActivitiesQueryOptions({ limit: 8 }),
    enabled: workspaceReady,
  });

  const totalMinor = useMemo(() => {
    if (!accountsQuery.data) return 0;
    return accountsQuery.data
      .filter((a) => !a.archived)
      .reduce((sum, a) => sum + a.balanceMinor, 0);
  }, [accountsQuery.data]);

  const lineData = useMemo(
    () =>
      (seriesQuery.data ?? []).map((p) => ({
        date: p.date,
        netMinor: p.totalMinor,
      })),
    [seriesQuery.data],
  );

  const loading =
    accountsQuery.isLoading || seriesQuery.isLoading || activitiesQuery.isLoading;

  return (
    <div className="col-span-2 min-w-0 space-y-6 md:col-span-6 lg:col-span-12">
      {loading ? (
        <>
          <Skeleton className="h-24 w-full max-w-md" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-40 w-full" />
        </>
      ) : null}

      {accountsQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {queryErrorMessage(accountsQuery.error) ?? "Could not load savings"}
        </p>
      ) : null}

      {accountsQuery.isSuccess && accountsQuery.data.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted">No savings accounts yet.</p>
          <Link
            href="/savings/new"
            className="mt-4 inline-block font-medium text-foreground underline-offset-2 transition-colors duration-150 hover:underline"
          >
            Add your first activity
          </Link>
        </Card>
      ) : null}

      {accountsQuery.isSuccess && accountsQuery.data.length > 0 ? (
        <>
          <Card className="p-5">
            <p className="text-sm text-muted">Total balance</p>
            <p className="mt-1 font-display text-3xl font-semibold tracking-tight">
              {formatMinor(totalMinor, defaultCurrency)}
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-lg font-medium">Balance over time</h2>
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
                <p className="text-sm text-muted">No balance history in this range.</p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-medium">Recent activities</h2>
              <Link
                href="/savings/activities"
                className="text-sm font-medium text-foreground underline-offset-2 transition-colors duration-150 hover:underline"
              >
                View all
              </Link>
            </div>
            {activitiesQuery.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {queryErrorMessage(activitiesQuery.error) ??
                  "Could not load activities"}
              </p>
            ) : null}
            {activitiesQuery.isSuccess && activitiesQuery.data.items.length === 0 ? (
              <p className="text-sm text-muted">No activities yet.</p>
            ) : null}
            {activitiesQuery.isSuccess && activitiesQuery.data.items.length > 0 ? (
              <ul className="divide-y divide-border text-sm">
                {activitiesQuery.data.items.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{row.accountName}</p>
                      <p className="text-xs text-muted">
                        {formatDate(row.activityDate)} · {row.type}
                      </p>
                    </div>
                    <span className="tabular-nums font-medium">
                      {formatMinor(row.amountMinor, row.accountCurrency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        </>
      ) : null}
    </div>
  );
}
