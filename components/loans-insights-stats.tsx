"use client";

import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { AboutDisclosure } from "@/components/ui/about-disclosure";
import { useTheme } from "@/components/theme-provider";
import { chartExpenseColor } from "@/components/charts/chart-income-expense-colors";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import type { LoansInsightsAtf } from "@/lib/loans-query-options";

function formatAprBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function LoansInsightsStats({
  atf,
  currency,
}: {
  atf: LoansInsightsAtf;
  currency: string;
}) {
  const { resolved, style } = useTheme();
  const { formatDate } = useFormatDate();
  const remainingColor = chartExpenseColor(resolved, style);
  const aprLabel =
    atf.summary.weightedAprBps == null
      ? "—"
      : formatAprBps(atf.summary.weightedAprBps);

  return (
    <div className="col-span-2 grid gap-3 md:col-span-6 lg:col-span-12 fx-fade-in">
      <p className="text-sm text-muted">
        Active loans
        {atf.summary.loanCount > 0 ? ` · ${atf.summary.loanCount} on file` : null}
      </p>
      <div
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3"
        aria-label="Summary metrics"
      >
        <Card className="px-4 py-4">
          <p className="text-sm font-medium text-muted">Remaining</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            <AnimatedNumber
              value={atf.summary.remainingMinor}
              format={(n) => formatMinor(Math.round(n), currency)}
              style={{ color: remainingColor }}
            />
          </p>
        </Card>
        <Card className="px-4 py-4">
          <p className="text-sm font-medium text-muted">Monthly obligation</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            <AnimatedNumber
              value={atf.summary.monthlyObligationMinor}
              format={(n) => formatMinor(Math.round(n), currency)}
              style={{ color: remainingColor }}
            />
          </p>
        </Card>
        <Card className="px-4 py-4">
          <p className="flex items-center gap-1 text-sm font-medium text-muted">
            Weighted APR
            <AboutDisclosure label="About weighted APR">
              Remaining-balance-weighted average of each active loan’s APR.
            </AboutDisclosure>
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {aprLabel}
          </p>
        </Card>
        <Card className="px-4 py-4">
          <p className="text-sm font-medium text-muted">Next due</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {atf.summary.nextDueDate
              ? formatDate(atf.summary.nextDueDate, { omitYearIfCurrent: true })
              : "—"}
          </p>
        </Card>
      </div>
    </div>
  );
}
