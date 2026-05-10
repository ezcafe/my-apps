"use client";

import { formatMinor } from "@/lib/format-money";

export type AnalyticsStatsPayload = {
  expenseMinor: number;
  incomeMinor: number;
  netMinor: number;
  transactionCount: number;
};

type ColumnRow = { month: string; expenseMinor: number; incomeMinor: number };

function formatPeriod(fromIso: string, toIso: string) {
  try {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    const opts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(undefined, opts)}`;
  } catch {
    return "";
  }
}

function expenseMomTrend(column: ColumnRow[]) {
  const withExpense = column.filter((m) => m.expenseMinor > 0);
  if (withExpense.length < 2) return null;
  const last = withExpense[withExpense.length - 1]!;
  const prev = withExpense[withExpense.length - 2]!;
  if (prev.expenseMinor <= 0) return null;
  const raw =
    ((last.expenseMinor - prev.expenseMinor) / prev.expenseMinor) * 100;
  const pct = Math.round(raw);
  if (pct === 0) return { pct: 0, direction: "flat" as const };
  return {
    pct: Math.abs(pct),
    direction: raw > 0 ? ("up" as const) : ("down" as const),
  };
}

/** Summary metrics row — “simple in cards” stats layout (Tailwind Plus-style). */
export function AnalyticsStats({
  stats,
  column,
  range,
  currency,
}: {
  stats: AnalyticsStatsPayload;
  column: ColumnRow[];
  range: { from: string; to: string };
  currency: string;
}) {
  const period = formatPeriod(range.from, range.to);
  const mom = expenseMomTrend(column);

  return (
    <div className="col-span-2 grid gap-2 md:col-span-6 lg:col-span-12">
      <p className="text-xs text-muted">
        {period ? <>Totals for {period}</> : <>Totals for selected range</>}
      </p>
      <div
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2"
        aria-label="Workspace analytics summary"
      >
        <article className="rounded-md border border-border bg-surface px-4 py-5">
          <p className="text-sm font-medium text-muted">Total income</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {formatMinor(stats.incomeMinor, currency)}
          </p>
          <p className="mt-1 text-xs text-muted">Recorded in workspace</p>
        </article>

        <article className="rounded-md border border-border bg-surface px-4 py-5">
          <p className="text-sm font-medium text-muted">Total expenses</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {formatMinor(stats.expenseMinor, currency)}
          </p>
          {mom ? (
            <p
              className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                mom.direction === "up"
                  ? "text-rose-600 dark:text-rose-400"
                  : mom.direction === "down"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted"
              }`}
            >
              <span aria-hidden>
                {mom.direction === "up"
                  ? "↑"
                  : mom.direction === "down"
                    ? "↓"
                    : "→"}
              </span>
              <span>
                {mom.direction === "flat"
                  ? "Flat vs prior month with spend"
                  : `${mom.pct}% vs prior spending month`}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted">
              Trend compares last two months with expense
            </p>
          )}
        </article>

        <article className="rounded-md border border-border bg-surface px-4 py-5">
          <p className="text-sm font-medium text-muted">Net flow</p>
          <p
            className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${
              stats.netMinor >= 0
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-700 dark:text-rose-400"
            }`}
          >
            {formatMinor(stats.netMinor, currency)}
          </p>
          <p className="mt-1 text-xs text-muted">Income minus expenses</p>
        </article>

        <article className="rounded-md border border-border bg-surface px-4 py-5">
          <p className="text-sm font-medium text-muted">Transactions</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {stats.transactionCount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted">In this period</p>
        </article>
      </div>
    </div>
  );
}
