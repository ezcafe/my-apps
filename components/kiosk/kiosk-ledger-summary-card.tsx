"use client";

import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import { useTheme } from "@/components/theme-provider";
import { formatMinor, formatCompactMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import type { KioskLedgerSummaryWidget } from "@/lib/kiosk/load-kiosk-page";

export function KioskLedgerSummaryCard({
  title,
  summary,
  currency,
  valueLabel = "Net",
}: {
  title: string;
  summary: KioskLedgerSummaryWidget;
  currency: string;
  valueLabel?: string;
}) {
  const { resolved, style } = useTheme();
  const { formatPeriod } = useFormatDate();
  const incomeColor = chartIncomeColor(resolved, style);
  const expenseColor = chartExpenseColor(resolved, style);
  const valueColor =
    summary.netMinor >= 0 ? incomeColor : expenseColor;
  const period = formatPeriod(summary.range.from, summary.range.to);
  const animationKey = `${summary.range.from}-${summary.range.to}`;

  return (
    <Card className="px-4 py-5">
      <p className="text-sm font-medium text-muted">{title}</p>
      <p
        title={formatMinor(summary.netMinor, currency)}
        className="mt-2 font-display text-4xl font-semibold tracking-tight tabular-nums"
      >
        <AnimatedNumber
          value={summary.netMinor}
          format={(n) => formatCompactMinor(Math.round(n), currency)}
          style={{ color: valueColor }}
          animationKey={animationKey}
        />
      </p>
      <p className="mt-1 text-sm text-muted">
        {period ? period : "This month"}
      </p>
      <dl
        className="mt-4 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-3 border-t border-border pt-4"
        aria-label={`${valueLabel} breakdown`}
      >
        <div className="min-w-0">
          <dt className="text-sm text-muted">Income</dt>
          <dd
            className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums"
            style={{ color: incomeColor }}
          >
            {formatCompactMinor(summary.incomeMinor, currency)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-sm text-muted">Expenses</dt>
          <dd
            className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums"
            style={{ color: expenseColor }}
          >
            {formatCompactMinor(summary.expenseMinor, currency)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
