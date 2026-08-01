"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  getLoansTodayIso,
  LoansOverviewSummary,
} from "@/components/loan-list-card";
import { LoanPayActions } from "@/components/loan-pay-actions";
import { LoansDueBanner } from "@/components/loans-due-banner";
import { useLoansWorkspace } from "@/components/loans-workspace-provider";
import {
  MoneyEmptyState,
  MoneyListSkeleton,
  MoneyQueryErrorAlert,
} from "@/components/money-feedback";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/cn";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import {
  loansListQueryOptions,
  type LoanListItem,
} from "@/lib/loans-query-options";

type LoanFilter = "all" | "overdue" | "due_soon" | "active" | "paid_off";

const FILTER_OPTIONS: { value: LoanFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "due_soon", label: "Due soon" },
  { value: "active", label: "Active" },
  { value: "paid_off", label: "Paid off" },
];

function daysUntilDue(dueDate: string, todayIso: string): number {
  const due = new Date(`${dueDate}T12:00:00`);
  const today = new Date(`${todayIso}T12:00:00`);
  return Math.round(
    (due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
}

function isOverdue(loan: LoanListItem, todayIso: string): boolean {
  return (
    loan.status !== "paid_off" &&
    Boolean(loan.nextDueDate) &&
    daysUntilDue(loan.nextDueDate!, todayIso) < 0
  );
}

function isDueSoon(loan: LoanListItem, todayIso: string): boolean {
  if (loan.status === "paid_off" || !loan.nextDueDate) return false;
  const days = daysUntilDue(loan.nextDueDate, todayIso);
  return days >= 0 && days <= 7;
}

function matchesFilter(
  loan: LoanListItem,
  filter: LoanFilter,
  todayIso: string,
): boolean {
  switch (filter) {
    case "overdue":
      return isOverdue(loan, todayIso);
    case "due_soon":
      return isDueSoon(loan, todayIso);
    case "active":
      return loan.status !== "paid_off";
    case "paid_off":
      return loan.status === "paid_off";
    default:
      return true;
  }
}

function sortByNextDue(a: LoanListItem, b: LoanListItem, todayIso: string): number {
  if (a.status === "paid_off" && b.status !== "paid_off") return 1;
  if (b.status === "paid_off" && a.status !== "paid_off") return -1;
  if (!a.nextDueDate && !b.nextDueDate) return a.name.localeCompare(b.name);
  if (!a.nextDueDate) return 1;
  if (!b.nextDueDate) return -1;
  const dayDiff =
    daysUntilDue(a.nextDueDate, todayIso) - daysUntilDue(b.nextDueDate, todayIso);
  if (dayDiff !== 0) return dayDiff;
  return a.name.localeCompare(b.name);
}

function statusLabel(loan: LoanListItem, todayIso: string): string {
  if (loan.status === "paid_off") return "Paid off";
  if (isOverdue(loan, todayIso)) return "Overdue";
  if (isDueSoon(loan, todayIso)) return "Due soon";
  return "Active";
}

function statusTagClass(loan: LoanListItem, todayIso: string): string {
  if (loan.status === "paid_off") {
    return "border-accent/30 bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] text-accent";
  }
  if (isOverdue(loan, todayIso) || isDueSoon(loan, todayIso)) {
    return "border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] text-[var(--alert-warning-title)]";
  }
  return "text-muted";
}

function LoansTable({
  loans,
  todayIso,
}: {
  loans: LoanListItem[];
  todayIso: string;
}) {
  const router = useRouter();
  const { formatDate } = useFormatDate();

  return (
    <Card className="w-full min-w-0 p-4">
      <div className="hidden min-w-0 rounded-[var(--radius-md)] border border-border @md:block">
        <table className="w-full table-fixed divide-y divide-border text-left text-sm">
          <caption className="sr-only">
            Loans with remaining balance, next due date, and payment actions
          </caption>
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead className="bg-muted-surface">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Loan
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2 font-medium text-right">
                Remaining
              </th>
              <th scope="col" className="px-3 py-2 font-medium text-right">
                Monthly
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Next due
              </th>
              <th scope="col" className="px-3 py-2 font-medium text-right">
                Progress
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loans.map((loan) => {
              const urgent =
                isOverdue(loan, todayIso) || isDueSoon(loan, todayIso);
              const canPay =
                loan.status !== "paid_off" &&
                loan.nextScheduleInstallmentId != null &&
                loan.nextInstallmentNumber != null;

              return (
                <tr
                  key={loan.id}
                  className="cursor-pointer transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)]"
                  onClick={() => router.push(`/money/loans/${loan.id}`)}
                >
                  <td className="max-w-0 truncate px-3 py-3 font-medium">
                    <Link
                      href={`/money/loans/${loan.id}`}
                      className="block truncate hover:text-accent"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {loan.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <Tag className={statusTagClass(loan, todayIso)}>
                      {statusLabel(loan, todayIso)}
                    </Tag>
                  </td>
                  <td className="truncate px-3 py-3 text-right tabular-nums">
                    {formatMinor(loan.remainingMinor, loan.currency)}
                  </td>
                  <td className="truncate px-3 py-3 text-right tabular-nums">
                    {formatMinor(loan.paymentMinor, loan.currency)}
                  </td>
                  <td
                    className={cn(
                      "truncate px-3 py-3 tabular-nums",
                      urgent && "font-medium text-destructive",
                    )}
                  >
                    {loan.nextDueDate && loan.status !== "paid_off"
                      ? formatDate(loan.nextDueDate, {
                          omitYearIfCurrent: true,
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {loan.percentComplete.toFixed(1)}%
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {canPay ? (
                        <LoanPayActions
                          variant="compact"
                          scheduleInstallmentId={
                            loan.nextScheduleInstallmentId!
                          }
                          loanName={loan.name}
                          installmentNumber={loan.nextInstallmentNumber!}
                          paymentMinor={loan.paymentMinor}
                          currency={loan.currency}
                          moneyAccountId={loan.moneyAccountId}
                          moneyCategoryId={loan.moneyCategoryId}
                        />
                      ) : (
                        <Link
                          href={`/money/loans/${loan.id}`}
                          className="text-sm font-medium text-accent transition-colors duration-150 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 @md:hidden">
        {loans.map((loan) => {
          const urgent =
            isOverdue(loan, todayIso) || isDueSoon(loan, todayIso);
          const canPay =
            loan.status !== "paid_off" &&
            loan.nextScheduleInstallmentId != null &&
            loan.nextInstallmentNumber != null;

          return (
            <li
              key={loan.id}
              className="rounded-[var(--radius-md)] border border-border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/money/loans/${loan.id}`}
                  className="font-display text-base font-semibold leading-tight hover:text-accent"
                >
                  {loan.name}
                </Link>
                <Tag className={statusTagClass(loan, todayIso)}>
                  {statusLabel(loan, todayIso)}
                </Tag>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
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
                {loan.nextDueDate && loan.status !== "paid_off" ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Next due</dt>
                    <dd
                      className={cn(
                        "tabular-nums",
                        urgent && "font-medium text-destructive",
                      )}
                    >
                      {formatDate(loan.nextDueDate, {
                        omitYearIfCurrent: true,
                      })}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Progress</dt>
                  <dd className="tabular-nums">
                    {loan.percentComplete.toFixed(1)}%
                  </dd>
                </div>
              </dl>
              <div className="mt-3">
                {canPay ? (
                  <LoanPayActions
                    variant="compact"
                    scheduleInstallmentId={loan.nextScheduleInstallmentId!}
                    loanName={loan.name}
                    installmentNumber={loan.nextInstallmentNumber!}
                    paymentMinor={loan.paymentMinor}
                    currency={loan.currency}
                    moneyAccountId={loan.moneyAccountId}
                    moneyCategoryId={loan.moneyCategoryId}
                  />
                ) : (
                  <Link
                    href={`/money/loans/${loan.id}`}
                    className="text-sm font-medium text-accent"
                  >
                    View details →
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function LoansDashboard() {
  const { workspaceReady, defaultCurrency } = useLoansWorkspace();
  const listQuery = useQuery({
    ...loansListQueryOptions(),
    enabled: workspaceReady,
  });
  const todayIso = getLoansTodayIso();
  const currency = defaultCurrency ?? "USD";
  const [filter, setFilter] = useState<LoanFilter>("all");

  const filteredLoans = useMemo(() => {
    if (!listQuery.data) return [];
    return listQuery.data
      .filter((loan) => matchesFilter(loan, filter, todayIso))
      .sort((a, b) => sortByNextDue(a, b, todayIso));
  }, [filter, listQuery.data, todayIso]);

  return (
    <div className="min-w-0 space-y-6">
      <LoansDueBanner />

      {listQuery.isLoading ? (
        <>
          <MoneyListSkeleton variant="summaryTiles" />
          <MoneyListSkeleton variant="loansTable" />
        </>
      ) : null}

      {listQuery.isError ? (
        <MoneyQueryErrorAlert
          title="Couldn’t load loans"
          error={listQuery.error}
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}

      {listQuery.isSuccess && listQuery.data.length === 0 ? (
        <MoneyEmptyState
          icon="loan"
          accentChartIndex={6}
          title="No active loans yet"
          description="Create a loan to track payments, due dates, and payoff progress in one place."
          minHeightClass="min-h-[200px]"
          primaryAction={{
            href: "/money/loans/new",
            label: "Create your first loan",
          }}
        />
      ) : null}

      {listQuery.isSuccess && listQuery.data.length > 0 ? (
        <>
          <LoansOverviewSummary loans={listQuery.data} currency={currency} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-base font-medium">Your loans</h3>
            <div
              className="inline-flex rounded-[var(--radius-sm)] border border-border p-0.5"
              role="group"
              aria-label="Filter loans"
            >
              {FILTER_OPTIONS.map(({ value, label }) => {
                const active = filter === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={cn(
                      "rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors duration-150 fx-press",
                      active
                        ? "bg-muted-surface text-foreground"
                        : "text-muted hover:text-foreground",
                    )}
                    aria-pressed={active}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredLoans.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No loans match this filter.
            </p>
          ) : (
            <div className="@container">
              <LoansTable loans={filteredLoans} todayIso={todayIso} />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
