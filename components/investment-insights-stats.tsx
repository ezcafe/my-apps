"use client";

import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { AboutDisclosure } from "@/components/ui/about-disclosure";
import { useTheme } from "@/components/theme-provider";
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import { cn } from "@/lib/cn";
import type { InvestmentInsightsAtf } from "@/lib/investment-query-options";

export function InvestmentInsightsStats({
  atf,
  currency,
  showPeriodCaption = true,
  variant = "grid",
}: {
  atf: InvestmentInsightsAtf;
  currency: string;
  showPeriodCaption?: boolean;
  variant?: "grid" | "page";
}) {
  const { resolved, style } = useTheme();
  const { formatPeriod } = useFormatDate();
  const period = formatPeriod(atf.range.from, atf.range.to);
  const resultsColor =
    atf.summary.resultsMinor >= 0
      ? chartIncomeColor(resolved, style)
      : chartExpenseColor(resolved, style);
  const realizedColor =
    atf.summary.realizedPnlMinor >= 0
      ? chartIncomeColor(resolved, style)
      : chartExpenseColor(resolved, style);
  const animationKey = `${atf.range.from}-${atf.range.to}`;

  return (
    <div
      className={cn(
        variant === "grid"
          ? "col-span-2 grid gap-3 md:col-span-6 lg:col-span-12"
          : "grid gap-3",
        "fx-fade-in",
      )}
    >
      {showPeriodCaption ? (
        <p className="text-sm text-muted">
          {period ? <>Results for {period}</> : <>Results for the default range</>}
        </p>
      ) : null}
      <div
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3"
        aria-label="Summary metrics"
      >
        <Card className="px-4 py-4">
          <p className="flex items-center gap-1 text-sm font-medium text-muted">
            Results
            <AboutDisclosure compact label="About results">
              Cash net on investment accounts for this range (income minus
              expenses) — the same Net as the investments ledger.
            </AboutDisclosure>
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            <AnimatedNumber
              value={atf.summary.resultsMinor}
              format={(n) => formatMinor(Math.round(n), currency)}
              style={{ color: resultsColor }}
              animationKey={animationKey}
            />
          </p>
        </Card>
        <Card className="px-4 py-4">
          <p className="flex items-center gap-1 text-sm font-medium text-muted">
            Open notional
            <AboutDisclosure compact label="About open notional">
              Absolute exposure of open lots: volume × contract size × price.
            </AboutDisclosure>
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            <AnimatedNumber
              value={atf.summary.openNotionalMinor}
              format={(n) => formatMinor(Math.round(n), currency)}
              animationKey={animationKey}
            />
          </p>
        </Card>
        <Card className="px-4 py-4">
          <p className="text-sm font-medium text-muted">Realized P&amp;L</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            <AnimatedNumber
              value={atf.summary.realizedPnlMinor}
              format={(n) => formatMinor(Math.round(n), currency)}
              style={{ color: realizedColor }}
              animationKey={animationKey}
            />
          </p>
        </Card>
        <Card className="px-4 py-4">
          <p className="text-sm font-medium text-muted">
            Open lots
          </p>
          <p
            className={cn(
              "mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl",
            )}
          >
            <AnimatedNumber
              value={atf.summary.openLotsCount}
              format={(n) => String(Math.round(n))}
              animationKey={animationKey}
            />
          </p>
        </Card>
      </div>
    </div>
  );
}
