"use client";

import { useMemo, useState } from "react";
import { AnalyticsEmptyState } from "@/components/analytics-empty-state";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/cn";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import type { LoanDetail } from "@/lib/loans-query-options";

type InstallmentRow = LoanDetail["installments"][number];
type Filter = "all" | "upcoming" | "paid";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isOverdue(row: InstallmentRow): boolean {
  return row.status === "pending" && row.dueDate < todayIso();
}

function statusLabel(row: InstallmentRow): string {
  if (row.status === "paid") return "Paid";
  if (row.status === "skipped") return "Skipped";
  if (isOverdue(row)) return "Overdue";
  return "Pending";
}

function statusTagClass(row: InstallmentRow): string {
  if (row.status === "paid") {
    return "border-accent/30 bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] text-accent";
  }
  if (row.status === "skipped") return "text-muted";
  if (isOverdue(row)) {
    return "border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] text-[var(--alert-warning-title)]";
  }
  return "";
}

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "paid", label: "Paid" },
];

function emptyCopy(filter: Filter): { title: string; description: string } {
  if (filter === "paid") {
    return {
      title: "No paid installments yet",
      description: "Payments you record will show up here.",
    };
  }
  if (filter === "upcoming") {
    return {
      title: "No upcoming payments",
      description: "This loan may already be paid off.",
    };
  }
  return {
    title: "No installments on this loan",
    description: "The payment schedule is empty.",
  };
}

export function LoanInstallmentsTable({
  loan,
  nextPendingId,
}: {
  loan: LoanDetail;
  nextPendingId: string | null;
}) {
  const { formatDate } = useFormatDate();
  const [filter, setFilter] = useState<Filter>("upcoming");

  const rows = useMemo(() => {
    const all = loan.installments;
    if (filter === "paid") {
      return all.filter((row) => row.status === "paid");
    }
    if (filter === "upcoming") {
      return all.filter((row) => row.status === "pending");
    }
    return all;
  }, [filter, loan.installments]);

  const paidCount = loan.installments.filter((i) => i.status === "paid").length;
  const overdueCount = loan.installments.filter(isOverdue).length;
  const empty = emptyCopy(filter);

  function renderRow(row: InstallmentRow) {
    const isNext = row.scheduleInstallmentId === nextPendingId;
    return (
      <TableRow key={row.scheduleInstallmentId} accent={isNext}>
        <TableCell freeze="leading" numeric className="whitespace-nowrap">
          {row.installmentNumber}
        </TableCell>
        <TableCell className="whitespace-nowrap text-muted">
          {formatDate(row.dueDate, { omitYearIfCurrent: true })}
        </TableCell>
        <TableCell align="end" numeric className="whitespace-nowrap">
          {formatMinor(row.paymentMinor, loan.currency)}
        </TableCell>
        <TableCell
          align="end"
          numeric
          className="whitespace-nowrap text-muted"
        >
          {formatMinor(row.interestMinor, loan.currency)}
        </TableCell>
        <TableCell align="end" numeric className="whitespace-nowrap">
          {formatMinor(row.principalMinor, loan.currency)}
        </TableCell>
        <TableCell
          align="end"
          numeric
          className="whitespace-nowrap text-muted"
        >
          {formatMinor(row.balanceAfterMinor, loan.currency)}
        </TableCell>
        <TableCell className="whitespace-nowrap">
          <Tag className={statusTagClass(row)}>{statusLabel(row)}</Tag>
          {row.paidWithoutTransaction && row.status === "paid" ? (
            <span className="ml-2 text-xs text-muted">No ledger entry</span>
          ) : null}
        </TableCell>
      </TableRow>
    );
  }

  function renderMobileCard(row: InstallmentRow) {
    const isNext = row.scheduleInstallmentId === nextPendingId;
    const dateLabel = formatDate(row.dueDate, { omitYearIfCurrent: true });
    const paymentLabel = formatMinor(row.paymentMinor, loan.currency);
    return (
      <div
        key={row.scheduleInstallmentId}
        className={cn(
          "flex min-h-12 items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3 transition-colors duration-150",
          isNext &&
            "border-accent/40 bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium tabular-nums">{paymentLabel}</p>
              <p className="mt-0.5 truncate text-base text-muted">
                #{row.installmentNumber}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted tabular-nums">
              {dateLabel}
            </span>
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
            <Tag className={statusTagClass(row)}>{statusLabel(row)}</Tag>
            {row.paidWithoutTransaction && row.status === "paid" ? (
              <span className="text-xs text-muted">No ledger entry</span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-base text-muted">
            Interest {formatMinor(row.interestMinor, loan.currency)} · Principal{" "}
            {formatMinor(row.principalMinor, loan.currency)}
          </p>
          <p className="mt-1 truncate text-base text-muted">
            Balance after {formatMinor(row.balanceAfterMinor, loan.currency)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="loan-installments-heading"
      className="@container col-span-2 w-full min-w-0 md:col-span-6 lg:col-span-12"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="loan-installments-heading"
            className="font-display text-lg font-medium"
          >
            Payment schedule
          </h2>
          <p className="mt-1 text-xs text-muted">
            {paidCount} of {loan.installments.length} installments paid
            {overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}
          </p>
        </div>
        <div
          className="inline-flex rounded-[var(--radius-sm)] border border-border p-0.5"
          role="radiogroup"
          aria-label="Filter installments"
        >
          {FILTER_OPTIONS.map(({ value, label }) => {
            const active = filter === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-[background-color,color] duration-150 fx-press",
                  active
                    ? "bg-muted-surface text-foreground"
                    : "text-muted hover:text-foreground",
                )}
                aria-checked={active}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <AnalyticsEmptyState
          icon="loan"
          title={empty.title}
          description={empty.description}
          minHeightClass="min-h-[220px]"
        />
      ) : (
        <>
          <div className="hidden @md:block">
            <Table maxHeight="min(28rem, 60dvh)">
              <TableCaption>
                Loan installment schedule with payment status
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead freeze="leading">#</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead align="end">Payment</TableHead>
                  <TableHead align="end">Interest</TableHead>
                  <TableHead align="end">Principal</TableHead>
                  <TableHead align="end">Balance after</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{rows.map(renderRow)}</TableBody>
            </Table>
          </div>
          <div className="space-y-2 @md:hidden">{rows.map(renderMobileCard)}</div>
        </>
      )}
    </section>
  );
}
