"use client";

import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { useTheme } from "@/components/theme-provider";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import {
  LOAN_CALCULATION_METHOD_LABELS,
  type LoanCalculationMethod,
} from "@/lib/loans-amortization";
import { colorByIndex } from "@/lib/theme-chart-palette";
import { cn } from "@/lib/cn";
import type { LoanDetail } from "@/lib/loans-query-options";

function formatApr(annualRateBps: number): string {
  return `${(annualRateBps / 100).toFixed(2)}%`;
}

function scheduleHint(monthsAheadBehind: number): {
  text: string;
  tone: "neutral" | "positive" | "negative";
} {
  if (monthsAheadBehind === 0) {
    return { text: "Payments match the original schedule", tone: "neutral" };
  }
  if (monthsAheadBehind > 0) {
    return {
      text: `${monthsAheadBehind} month${monthsAheadBehind === 1 ? "" : "s"} ahead of schedule`,
      tone: "positive",
    };
  }
  const behind = Math.abs(monthsAheadBehind);
  return {
    text: `${behind} month${behind === 1 ? "" : "s"} behind schedule`,
    tone: "negative",
  };
}

function toneClass(tone: "neutral" | "positive" | "negative"): string {
  if (tone === "positive") return "text-accent";
  if (tone === "negative") return "text-destructive";
  return "text-muted";
}

export function LoanDetailStats({ loan }: { loan: LoanDetail }) {
  const { resolved, style } = useTheme();
  const { formatDate } = useFormatDate();
  const remainingColor = colorByIndex(resolved, 1, style);
  const paidColor = colorByIndex(resolved, 3, style);
  const schedule = scheduleHint(loan.summary.monthsAheadBehind);
  const paidCount = loan.installments.filter((i) => i.status === "paid").length;
  const animationKey = loan.id;

  const contextParts = [
    LOAN_CALCULATION_METHOD_LABELS[
      loan.calculationMethod as LoanCalculationMethod
    ] ?? loan.calculationMethod,
    `${loan.termMonths}-month term at ${formatApr(loan.annualRateBps)} APR`,
    `Started ${formatDate(loan.startDate, { omitYearIfCurrent: true })}`,
    loan.status === "paid_off" ? "Paid off" : null,
  ].filter(Boolean);

  return (
    <div className="col-span-2 grid gap-2 md:col-span-6 lg:col-span-12 fx-fade-in">
      <p className="text-xs text-muted">
        {contextParts.join(" · ")}
        {loan.summary.projectedPayoffDate && loan.status !== "paid_off" ? (
          <>
            {" · "}
            Projected payoff{" "}
            {formatDate(loan.summary.projectedPayoffDate, {
              omitYearIfCurrent: true,
            })}
          </>
        ) : null}
      </p>
      <div
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2"
        aria-label="Loan summary"
      >
        <Card className="px-4 py-5">
          <p className="text-sm font-medium text-muted">Remaining balance</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">
            <AnimatedNumber
              value={loan.summary.remainingMinor}
              format={(n) => formatMinor(Math.round(n), loan.currency)}
              style={{ color: remainingColor }}
              animationKey={animationKey}
            />
          </p>
          <p className="mt-1 text-xs text-muted">
            {loan.status === "paid_off"
              ? "Loan is fully paid"
              : "Principal still owed"}
          </p>
        </Card>

        <Card className="px-4 py-5">
          <p className="text-sm font-medium text-muted">Monthly payment</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">
            {formatMinor(loan.paymentMinor, loan.currency)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Due on day {loan.dueDayOfMonth} each month
          </p>
        </Card>

        <Card className="px-4 py-5">
          <p className="text-sm font-medium text-muted">Total paid</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">
            <AnimatedNumber
              value={loan.summary.totalPaidMinor}
              format={(n) => formatMinor(Math.round(n), loan.currency)}
              style={{ color: paidColor }}
              animationKey={animationKey}
            />
          </p>
          <p className="mt-1 text-xs text-muted">
            {paidCount} of {loan.installments.length} installments paid
          </p>
        </Card>

        <Card className="px-4 py-5">
          <p className="text-sm font-medium text-muted">Progress</p>
          <p
            className={cn(
              "mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums",
              loan.summary.percentComplete >= 100
                ? "text-accent"
                : undefined,
            )}
          >
            {loan.summary.percentComplete.toFixed(1)}%
          </p>
          <p className={cn("mt-1 text-xs font-medium", toneClass(schedule.tone))}>
            {schedule.text}
          </p>
        </Card>
      </div>
    </div>
  );
}
