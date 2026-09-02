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
import type { HomePageData } from "@/lib/home-services/load-home-page";

export function HomeNetUnavailable({ currency }: { currency: string }) {
  return (
    <Card className="px-4 py-5">
      <p className="text-sm font-medium text-muted">Net</p>
      <p className="mt-3 text-sm text-muted">
        Unavailable{currency ? ` · default currency ${currency}` : ""}.
      </p>
    </Card>
  );
}

export function HomeNetCard({
  net,
  currency,
}: {
  net: NonNullable<HomePageData["net"]>;
  currency: string;
}) {
  const { resolved, style } = useTheme();
  const { formatPeriod } = useFormatDate();
  const incomeColor = chartIncomeColor(resolved, style);
  const expenseColor = chartExpenseColor(resolved, style);
  const netColor = net.netMinor >= 0 ? incomeColor : expenseColor;
  const period = formatPeriod(net.range.from, net.range.to);
  const animationKey = `${net.range.from}-${net.range.to}`;

  return (
    <Card className="px-4 py-5">
      <p className="text-sm font-medium text-muted">Net</p>
      <p
        title={formatMinor(net.netMinor, currency)}
        className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl"
      >
        <AnimatedNumber
          value={net.netMinor}
          format={(n) => formatCompactMinor(Math.round(n), currency)}
          style={{ color: netColor }}
          animationKey={animationKey}
        />
      </p>
      {period ? (
        <p className="mt-1 text-sm text-muted">Income minus expenses · {period}</p>
      ) : (
        <p className="mt-1 text-sm text-muted">Income minus expenses this month</p>
      )}
      <dl
        className="mt-4 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-3 border-t border-border pt-4"
        aria-label="Income and expenses"
      >
        <div className="min-w-0">
          <dt className="text-sm text-muted">Income</dt>
          <dd
            className="mt-1 font-display text-xl font-semibold tracking-tight tabular-nums sm:text-2xl"
            style={{ color: incomeColor }}
          >
            {formatCompactMinor(net.incomeMinor, currency)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-sm text-muted">Expenses</dt>
          <dd
            className="mt-1 font-display text-xl font-semibold tracking-tight tabular-nums sm:text-2xl"
            style={{ color: expenseColor }}
          >
            {formatCompactMinor(net.expenseMinor, currency)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
