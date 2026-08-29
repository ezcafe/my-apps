"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { AboutDisclosure } from "@/components/ui/about-disclosure";
import { AnimatedNumber } from "@/components/ui/animated-number";
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import { useTheme } from "@/components/theme-provider";
import { formatMinor, formatCompactMinor, formatCompactPercent } from "@/lib/format-money";
import { cn } from "@/lib/cn";
import { useFormatDate } from "@/lib/format-date";

export type AnalyticsStatsPayload = {
  expenseMinor: number;
  incomeMinor: number;
  netMinor: number;
  savingsRatePct: number | null;
};

type ColumnRow = { month: string; expenseMinor: number; incomeMinor: number };

export type AnalyticsStatCardId = "income" | "expense" | "net" | "savings";

const DEFAULT_CARD_ORDER: AnalyticsStatCardId[] = [
  "income",
  "expense",
  "net",
  "savings",
];

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

function trendColor(direction: "up" | "down" | "flat", positiveIsUp: boolean) {
  if (direction === "flat") return "text-muted";
  const isPositive = positiveIsUp ? direction === "up" : direction === "down";
  return isPositive ? "text-accent" : "text-destructive";
}

export function AnalyticsStats({
  stats,
  column,
  range,
  currency,
  cardOrder = DEFAULT_CARD_ORDER,
  showPeriodCaption = true,
}: {
  stats: AnalyticsStatsPayload;
  column?: ColumnRow[];
  range: { from: string; to: string };
  currency: string;
  /** Reorder KPI cards for ledger context (e.g. expenses first on Bills). */
  cardOrder?: readonly AnalyticsStatCardId[];
  /** When false, period is shown elsewhere (e.g. AnalyticsPeriodChip). */
  showPeriodCaption?: boolean;
}) {
  const { resolved, style } = useTheme();
  const { formatPeriod } = useFormatDate();
  const period = formatPeriod(range.from, range.to);
  const mom = expenseMomTrend(column ?? []);

  const incomeColor = chartIncomeColor(resolved, style);
  const expenseColor = chartExpenseColor(resolved, style);
  const netColor = stats.netMinor >= 0 ? incomeColor : expenseColor;
  const animationKey = `${range.from}-${range.to}`;

  const savingsPositive =
    stats.savingsRatePct != null && stats.savingsRatePct >= 0;

  const cards: Record<AnalyticsStatCardId, ReactNode> = {
    income: (
      <Card key="income" className="min-w-0 px-4 py-4">
        <p className="truncate text-sm font-medium text-muted">Income</p>
        <p
          title={formatMinor(stats.incomeMinor, currency)}
          className="mt-2 min-w-0 truncate font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
        >
          <AnimatedNumber
            value={stats.incomeMinor}
            format={(n) => formatCompactMinor(Math.round(n), currency)}
            style={{ color: incomeColor }}
            animationKey={animationKey}
          />
        </p>
      </Card>
    ),
    expense: (
      <Card key="expense" className="min-w-0 px-4 py-4">
        <p className="truncate text-sm font-medium text-muted">Expenses</p>
        <p
          title={formatMinor(stats.expenseMinor, currency)}
          className="mt-2 min-w-0 truncate font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
        >
          <AnimatedNumber
            value={stats.expenseMinor}
            format={(n) => formatCompactMinor(Math.round(n), currency)}
            style={{ color: expenseColor }}
            animationKey={animationKey}
          />
        </p>
        {mom ? (
          <p
            className={cn(
              "mt-1 flex items-center gap-1 truncate text-sm font-medium",
              trendColor(mom.direction, false),
            )}
          >
            <span aria-hidden>
              {mom.direction === "up"
                ? "↑"
                : mom.direction === "down"
                  ? "↓"
                  : "→"}
            </span>
            <span className="truncate">
              {mom.direction === "flat"
                ? "Flat vs prior month"
                : `${mom.pct}% vs prior month`}
            </span>
          </p>
        ) : null}
      </Card>
    ),
    net: (
      <Card key="net" className="min-w-0 px-4 py-4">
        <p className="truncate text-sm font-medium text-muted">Net</p>
        <p
          title={formatMinor(stats.netMinor, currency)}
          className="mt-2 min-w-0 truncate font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
        >
          <AnimatedNumber
            value={stats.netMinor}
            format={(n) => formatCompactMinor(Math.round(n), currency)}
            style={{ color: netColor }}
            animationKey={animationKey}
          />
        </p>
      </Card>
    ),
    savings: (
      <Card key="savings" className="min-w-0 px-4 py-4">
        <p className="flex items-center justify-between gap-1 text-sm font-medium text-muted">
          <span className="truncate">Savings rate</span>
          <AboutDisclosure compact label="About savings rate">
            Percent of income left after expenses in this period. When income is zero, savings
            rate is not shown.
          </AboutDisclosure>
        </p>
        <p
          title={
            stats.savingsRatePct == null
              ? undefined
              : `${stats.savingsRatePct.toFixed(1)}%`
          }
          className={cn(
            "mt-2 min-w-0 truncate font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl",
            stats.savingsRatePct == null
              ? "text-muted"
              : savingsPositive
                ? "text-accent"
                : "text-destructive",
          )}
        >
          {stats.savingsRatePct == null ? (
            "—"
          ) : (
            <AnimatedNumber
              value={stats.savingsRatePct}
              format={formatCompactPercent}
              animationKey={animationKey}
            />
          )}
        </p>
      </Card>
    ),
  };

  return (
    <div className="col-span-2 grid gap-3 md:col-span-6 lg:col-span-12 fx-fade-in">
      {showPeriodCaption ? (
        <p className="text-sm text-muted">
          {period ? <>Totals for {period}</> : <>Totals for selected range</>}
        </p>
      ) : null}
      <div
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3"
        aria-label="Summary metrics"
      >
        {cardOrder.map((id) => cards[id])}
      </div>
    </div>
  );
}
