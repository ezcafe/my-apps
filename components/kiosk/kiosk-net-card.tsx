"use client";

import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { formatMinor, formatCompactMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import type { KioskNetWidget } from "@/lib/kiosk/load-kiosk-page";

export function KioskNetUnavailable({ currency }: { currency: string }) {
  return (
    <Card className="px-4 py-5">
      <p className="text-sm font-medium text-muted">Net</p>
      <p className="mt-3 text-sm text-muted">
        Unavailable{currency ? ` · default currency ${currency}` : ""}.
      </p>
    </Card>
  );
}

export function KioskNetCard({
  net,
  currency,
}: {
  net: KioskNetWidget;
  currency: string;
}) {
  const { formatPeriod } = useFormatDate();
  const netPositive = net.netMinor >= 0;
  const period = formatPeriod(net.range.from, net.range.to);
  const animationKey = `${net.range.from}-${net.range.to}`;

  return (
    <Card className="px-4 py-5">
      <p className="text-sm font-medium text-muted">Net</p>
      <p
        title={formatMinor(net.netMinor, currency)}
        className="mt-2 font-display text-4xl font-semibold tracking-tight tabular-nums"
      >
        <AnimatedNumber
          value={net.netMinor}
          format={(n) => formatCompactMinor(Math.round(n), currency)}
          className={
            netPositive ? "text-[var(--chart-3)]" : "text-[var(--destructive)]"
          }
          animationKey={animationKey}
        />
      </p>
      <p className="mt-1 text-sm text-muted">
        {period ? period : "This month"}
      </p>
      <dl
        className="mt-4 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-3 border-t border-border pt-4"
        aria-label="Income and expenses"
      >
        <div className="min-w-0">
          <dt className="text-sm text-muted">Income</dt>
          <dd className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums text-[var(--chart-3)]">
            {formatCompactMinor(net.incomeMinor, currency)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-sm text-muted">Expenses</dt>
          <dd className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums text-[var(--destructive)]">
            {formatCompactMinor(net.expenseMinor, currency)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
