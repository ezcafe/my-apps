"use client";

import Link from "next/link";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { chartExpenseColor } from "@/components/charts/chart-income-expense-colors";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { useTheme } from "@/components/theme-provider";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import type { LoanListItem } from "@/lib/loans-query-options";
import { cn } from "@/lib/cn";

function dueTone(dueDate: string | null, todayIso: string): "neutral" | "urgent" {
  if (!dueDate) return "neutral";
  const due = new Date(`${dueDate}T12:00:00`);
  const today = new Date(`${todayIso}T12:00:00`);
  const diffDays = Math.round(
    (due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  return diffDays <= 7 ? "urgent" : "neutral";
}

export function LoanListCard({
  loan,
  todayIso,
}: {
  loan: LoanListItem;
  todayIso: string;
}) {
  const { formatDate } = useFormatDate();
  const paidOff = loan.status === "paid_off";
  const tone = dueTone(loan.nextDueDate, todayIso);

  return (
    <Link href={`/money/loans/${loan.id}`} className="fx-press block h-full">
      <Card className="flex h-full flex-col p-6 transition-[border-color] duration-200 hover:border-accent/40">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-lg font-semibold leading-tight">
            {loan.name}
          </h2>
          <Tag className={cn(paidOff ? "text-accent" : "text-muted")}>
            {paidOff ? "Paid off" : "Active"}
          </Tag>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between gap-2 text-sm text-muted">
            <span>Paid down</span>
            <span className="tabular-nums">{loan.percentComplete.toFixed(1)}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--foreground)_10%,transparent)]"
            role="progressbar"
            aria-valuenow={loan.percentComplete}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${loan.name} payoff progress`}
          >
            <div
              className="h-full rounded-[var(--radius-sm)] bg-accent transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(0, loan.percentComplete))}%` }}
            />
          </div>
        </div>

        <dl className="mt-4 flex flex-1 flex-col gap-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Remaining</dt>
            <dd className="tabular-nums font-medium">
              {formatMinor(loan.remainingMinor, loan.currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Monthly</dt>
            <dd className="tabular-nums">
              {formatMinor(loan.paymentMinor, loan.currency)}
            </dd>
          </div>
          {loan.nextDueDate && !paidOff ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Next due</dt>
              <dd
                className={cn(
                  "tabular-nums",
                  tone === "urgent" && "font-medium text-destructive",
                )}
              >
                {formatDate(loan.nextDueDate, { omitYearIfCurrent: true })}
              </dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-4 text-sm font-medium text-accent">View details →</p>
      </Card>
    </Link>
  );
}

export function LoansOverviewSummary({
  loans,
  currency,
}: {
  loans: LoanListItem[];
  currency: string;
}) {
  const { resolved, style } = useTheme();
  const amountColor = chartExpenseColor(resolved, style);
  const active = loans.filter((l) => l.status !== "paid_off");
  const remainingTotal = active.reduce((s, l) => s + l.remainingMinor, 0);
  const paymentTotal = active.reduce((s, l) => s + l.paymentMinor, 0);

  if (loans.length === 0) return null;

  return (
    <div
      className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3"
      aria-label="Summary metrics"
    >
      <Card className="px-4 py-4">
        <p className="text-sm font-medium text-muted">Active loans</p>
        <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
          <AnimatedNumber
            value={active.length}
            format={(n) => String(Math.round(n))}
          />
        </p>
      </Card>
      <Card className="px-4 py-4">
        <p className="text-sm font-medium text-muted">Total remaining</p>
        <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
          <AnimatedNumber
            value={remainingTotal}
            format={(n) => formatMinor(Math.round(n), currency)}
            style={{ color: amountColor }}
          />
        </p>
      </Card>
      <Card className="px-4 py-4">
        <p className="text-sm font-medium text-muted">Monthly payments</p>
        <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
          <AnimatedNumber
            value={paymentTotal}
            format={(n) => formatMinor(Math.round(n), currency)}
            style={{ color: amountColor }}
          />
        </p>
      </Card>
    </div>
  );
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getLoansTodayIso(): string {
  return todayIso();
}
