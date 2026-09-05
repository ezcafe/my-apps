"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { LoanPayActions } from "@/components/loan-pay-actions";
import { Alert } from "@/components/ui/alert";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import type { KioskLoansPaymentsWidget } from "@/lib/kiosk/load-kiosk-page";

function LoanPaymentRow({
  loanName,
  loanHref,
  meta,
  amountLabel,
  actions,
  urgent,
}: {
  loanName: string;
  loanHref: string;
  meta: string;
  amountLabel: string;
  actions?: ReactNode;
  urgent?: boolean;
}) {
  return (
    <div
      className="@container flex flex-col gap-2 px-3 py-3 @[28rem]:flex-row @[28rem]:items-center @[28rem]:justify-between"
    >
      <div className="min-w-0">
        <Link
          href={loanHref}
          className="font-medium text-foreground transition-colors duration-150 hover:text-accent"
        >
          {loanName}
        </Link>
        <p className="mt-0.5 text-sm text-muted">{meta}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 tabular-nums">
        <span
          className={
            urgent
              ? "font-medium text-[var(--alert-warning-fg)]"
              : "text-sm text-foreground"
          }
        >
          {amountLabel}
        </span>
        {actions}
      </div>
    </div>
  );
}

export function KioskLoansCard({
  loans,
}: {
  loans: KioskLoansPaymentsWidget;
}) {
  const { formatDate } = useFormatDate();
  const hasOverdue = loans.overdue.length > 0;
  const hasUpcoming = loans.upcoming.length > 0;
  const hasRows = hasOverdue || hasUpcoming;

  return (
    <div className="space-y-4">
      {hasOverdue ? (
        <Alert
          variant="warning"
          title={
            loans.overdue.length === 1
              ? "1 payment overdue"
              : `${loans.overdue.length} payments overdue`
          }
          description="Settle these first to avoid extra interest or fees."
        />
      ) : null}

      {hasRows ? (
        <div className="divide-y divide-border rounded-[var(--radius-sm)] bg-background">
          {loans.overdue.map((item) => (
            <LoanPaymentRow
              key={item.scheduleInstallmentId}
              loanName={item.loanName}
              loanHref={`/loans/${item.loanId}`}
              meta={`Installment #${item.installmentNumber} · due ${formatDate(item.dueDate, { omitYearIfCurrent: true }) ?? item.dueDate}`}
              amountLabel={formatMinor(item.paymentMinor, item.currency)}
              urgent
              actions={
                <LoanPayActions
                  variant="compact"
                  scheduleInstallmentId={item.scheduleInstallmentId}
                  loanName={item.loanName}
                  installmentNumber={item.installmentNumber}
                  paymentMinor={item.paymentMinor}
                  currency={item.currency}
                  moneyAccountId={item.moneyAccountId}
                  moneyCategoryId={item.moneyCategoryId}
                />
              }
            />
          ))}
          {loans.upcoming.map((loan) => (
            <LoanPaymentRow
              key={loan.id}
              loanName={loan.name}
              loanHref={`/loans/${loan.id}`}
              meta={
                loan.nextDueDate
                  ? `Next due ${formatDate(loan.nextDueDate, { omitYearIfCurrent: true }) ?? loan.nextDueDate}`
                  : "Next due date unavailable"
              }
              amountLabel={formatMinor(loan.paymentMinor, loan.currency)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-sm)] border border-dashed border-border bg-background px-4 py-8 text-center">
          <p className="font-medium text-foreground">No upcoming payments</p>
          <p className="mt-1 text-sm text-muted">
            Active loans with a due date will show up here.
          </p>
        </div>
      )}
    </div>
  );
}
