"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { LoanPayActions } from "@/components/loan-pay-actions";
import { LoansDueBanner } from "@/components/loans-due-banner";
import { LoansInsightsStats } from "@/components/loans-insights-stats";
import { LoansOverviewPageSkeleton } from "@/components/loans-page-skeleton";
import { useLoansWorkspace } from "@/components/loans-workspace-provider";
import {
  MoneyEmptyState,
  MoneyQueryErrorAlert,
} from "@/components/money-feedback";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowActions,
} from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/cn";
import { moneyQuickPickChipCls, moneyQuickPickGroupCls } from "@/lib/money-quick-pick-chip-cls";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import { loansInsightsDefaultRange } from "@/lib/money-first-load-filters";
import { MoneyStatusEmphasis, MoneyStatusStrip } from "@/lib/money-status-strip";
import { getLoansTodayIso } from "@/lib/loans-today";
import {
  loansInsightsAtfQueryOptions,
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
    <div className="w-full min-w-0">
      <div className="hidden min-w-0 @md:block">
        <Table>
          <TableCaption>
            Loans with remaining balance, next due date, and payment actions
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead freeze="leading">Loan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead align="end">Remaining</TableHead>
              <TableHead align="end">Monthly</TableHead>
              <TableHead>Next due</TableHead>
              <TableHead align="end">Progress</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map((loan) => {
              const urgent =
                isOverdue(loan, todayIso) || isDueSoon(loan, todayIso);
              const canPay =
                loan.status !== "paid_off" &&
                loan.nextScheduleInstallmentId != null &&
                loan.nextInstallmentNumber != null;

              return (
                <TableRow
                  key={loan.id}
                  clickable
                  onClick={() => router.push(`/loans/${loan.id}`)}
                >
                  <TableCell freeze="leading" className="max-w-0 truncate font-medium">
                    <Link
                      href={`/loans/${loan.id}`}
                      className="block truncate hover:text-accent"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {loan.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Tag className={statusTagClass(loan, todayIso)}>
                      {statusLabel(loan, todayIso)}
                    </Tag>
                  </TableCell>
                  <TableCell align="end" numeric className="truncate">
                    {formatMinor(loan.remainingMinor, loan.currency)}
                  </TableCell>
                  <TableCell align="end" numeric className="truncate">
                    {formatMinor(loan.paymentMinor, loan.currency)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "truncate tabular-nums",
                      urgent && "font-medium text-destructive",
                    )}
                  >
                    {loan.nextDueDate && loan.status !== "paid_off"
                      ? formatDate(loan.nextDueDate, {
                          omitYearIfCurrent: true,
                        })
                      : "—"}
                  </TableCell>
                  <TableCell align="end" numeric>
                    {loan.percentComplete.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <TableRowActions>
                      {canPay ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
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
                        </div>
                      ) : (
                        <Link
                          href={`/loans/${loan.id}`}
                          className="text-sm font-medium text-accent transition-colors duration-150 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View
                        </Link>
                      )}
                    </TableRowActions>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
                  href={`/loans/${loan.id}`}
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
                    href={`/loans/${loan.id}`}
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
    </div>
  );
}

export function LoansDashboard() {
  const { workspaceReady, defaultCurrency, dueCount } = useLoansWorkspace();
  const pageDefault = useMemo(() => loansInsightsDefaultRange(), []);
  const listQuery = useQuery({
    ...loansListQueryOptions(),
    enabled: workspaceReady,
  });
  const atfQuery = useQuery({
    ...loansInsightsAtfQueryOptions(pageDefault.from, pageDefault.to),
    enabled: workspaceReady,
  });
  const todayIso = getLoansTodayIso();
  const [filter, setFilter] = useState<LoanFilter>("all");
  const currency = defaultCurrency ?? "USD";

  const filteredLoans = useMemo(() => {
    if (!listQuery.data) return [];
    return listQuery.data
      .filter((loan) => matchesFilter(loan, filter, todayIso))
      .sort((a, b) => sortByNextDue(a, b, todayIso));
  }, [filter, listQuery.data, todayIso]);

  const overdueLoanCount = useMemo(() => {
    if (!listQuery.data) return 0;
    return listQuery.data.filter((loan) => isOverdue(loan, todayIso)).length;
  }, [listQuery.data, todayIso]);

  const dueSoonLoanCount = useMemo(() => {
    if (!listQuery.data) return 0;
    return listQuery.data.filter(
      (loan) => isDueSoon(loan, todayIso) && !isOverdue(loan, todayIso),
    ).length;
  }, [listQuery.data, todayIso]);

  const showStatusStrip =
    overdueLoanCount > 0 || dueSoonLoanCount > 0 || dueCount > 0;

  const loading =
    !workspaceReady ||
    (listQuery.isLoading && !listQuery.data) ||
    (atfQuery.isLoading && !atfQuery.data);

  if (loading) {
    return <LoansOverviewPageSkeleton />;
  }

  return (
    <div className="min-w-0 space-y-4">
      <LoansDueBanner />

      {atfQuery.isError ? (
        <MoneyQueryErrorAlert
          title="Couldn't load summary"
          error={atfQuery.error}
          onRetry={() => void atfQuery.refetch()}
        />
      ) : null}

      {atfQuery.data && atfQuery.data.summary.loanCount > 0 ? (
        <section aria-label="Loans summary">
          <LoansInsightsStats
            atf={atfQuery.data}
            currency={currency}
            showPeriodCaption={false}
            showActiveLoansCaption={false}
            variant="page"
            overdueCount={overdueLoanCount}
          />
        </section>
      ) : null}

      {showStatusStrip ? (
        <MoneyStatusStrip>
          {overdueLoanCount > 0 ? (
            <>
              <MoneyStatusEmphasis>{overdueLoanCount}</MoneyStatusEmphasis>{" "}
              {overdueLoanCount === 1 ? "loan overdue" : "loans overdue"}
            </>
          ) : null}
          {overdueLoanCount > 0 && (dueSoonLoanCount > 0 || dueCount > 0)
            ? " · "
            : null}
          {dueSoonLoanCount > 0 ? (
            <>
              <MoneyStatusEmphasis>{dueSoonLoanCount}</MoneyStatusEmphasis>{" "}
              {dueSoonLoanCount === 1 ? "loan due soon" : "loans due soon"}
            </>
          ) : null}
          {dueSoonLoanCount > 0 && dueCount > 0 ? " · " : null}
          {dueCount > 0 ? (
            <>
              <MoneyStatusEmphasis>{dueCount}</MoneyStatusEmphasis>{" "}
              {dueCount === 1
                ? "installment due or overdue"
                : "installments due or overdue"}
            </>
          ) : null}
        </MoneyStatusStrip>
      ) : null}

      {listQuery.isError ? (
        <MoneyQueryErrorAlert
          title="Couldn't load loans"
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
            href: "/loans/new",
            label: "Create your first loan",
          }}
        />
      ) : null}

      {listQuery.isSuccess && listQuery.data.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-base font-medium">Your loans</h3>
            <div
              className={moneyQuickPickGroupCls}
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
                    className={moneyQuickPickChipCls(active)}
                    aria-pressed={active}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredLoans.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
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
