"use client";

import { AnimatedNumber } from "@/components/ui/animated-number";
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import { useTheme } from "@/components/theme-provider";
import { formatMinor } from "@/lib/format-money";
import { cn } from "@/lib/cn";
import { useFormatDate } from "@/lib/format-date";

export type AnalyticsStatsPayload = {
  expenseMinor: number;
  incomeMinor: number;
  netMinor: number;
  savingsRatePct: number | null;
};

type ColumnRow = { month: string; expenseMinor: number; incomeMinor: number };

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
}: {
  stats: AnalyticsStatsPayload;
  column?: ColumnRow[];
  range: { from: string; to: string };
  currency: string;
}) {
  const { resolved, style } = useTheme();
  const { formatPeriod } = useFormatDate();
  const period = formatPeriod(range.from, range.to);
  const mom = expenseMomTrend(column ?? []);

  const incomeColor = chartIncomeColor(resolved, style);
  const expenseColor = chartExpenseColor(resolved, style);
  const netColor = stats.netMinor >= 0 ? incomeColor : expenseColor;
  const animationKey = `${range.from}-${range.to}`;
  const savingsLabel =
    stats.savingsRatePct == null
      ? "—"
      : `${stats.savingsRatePct.toFixed(1)}%`;
  const savingsPositive =
    stats.savingsRatePct != null && stats.savingsRatePct >= 0;

  return (
    <div className="col-span-2 grid gap-2 border-b border-border pb-4 md:col-span-6 lg:col-span-12 fx-fade-in">
      <p className="text-xs text-muted">
        {period ? <>Totals for {period}</> : <>Totals for selected range</>}
      </p>
      <div
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-x-6 gap-y-3"
        aria-label="Workspace analytics summary"
      >
        <div>
          <p className="text-sm font-medium text-muted">Income</p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums">
            <AnimatedNumber
              value={stats.incomeMinor}
              format={(n) => formatMinor(Math.round(n), currency)}
              style={{ color: incomeColor }}
              animationKey={animationKey}
            />
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-muted">Expenses</p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums">
            <AnimatedNumber
              value={stats.expenseMinor}
              format={(n) => formatMinor(Math.round(n), currency)}
              style={{ color: expenseColor }}
              animationKey={animationKey}
            />
          </p>
          {mom ? (
            <p
              className={cn(
                "mt-1 flex items-center gap-1 text-xs font-medium",
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
              <span>
                {mom.direction === "flat"
                  ? "Flat vs prior month"
                  : `${mom.pct}% vs prior month`}
              </span>
            </p>
          ) : null}
        </div>

        <div>
          <p className="text-sm font-medium text-muted">Net</p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums">
            <AnimatedNumber
              value={stats.netMinor}
              format={(n) => formatMinor(Math.round(n), currency)}
              style={{ color: netColor }}
              animationKey={animationKey}
            />
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-muted">Savings rate</p>
          <p
            className={cn(
              "mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums",
              stats.savingsRatePct == null
                ? "text-muted"
                : savingsPositive
                  ? "text-accent"
                  : "text-destructive",
            )}
          >
            {savingsLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
