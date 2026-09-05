"use client";

import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
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
  const { formatPeriod } = useFormatDate();
  const valuePositive = summary.netMinor >= 0;
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
          className={
            valuePositive ? "text-[var(--chart-3)]" : "text-[var(--destructive)]"
          }
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
          <dd className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums text-[var(--chart-3)]">
            {formatCompactMinor(summary.incomeMinor, currency)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-sm text-muted">Expenses</dt>
          <dd className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums text-[var(--destructive)]">
            {formatCompactMinor(summary.expenseMinor, currency)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
