"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
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

  return (
    <Card className="col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-medium">Payment schedule</h2>
          <p className="mt-1 text-xs text-muted">
            {paidCount} of {loan.installments.length} installments paid
            {overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}
          </p>
        </div>
        <div
          className="inline-flex rounded-[var(--radius-sm)] border border-border p-0.5"
          role="group"
          aria-label="Filter installments"
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

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          {filter === "paid"
            ? "No paid installments yet."
            : filter === "upcoming"
              ? "No upcoming payments — this loan may be paid off."
              : "No installments on this loan."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
          <table className="min-w-full divide-y divide-border text-left text-sm">
            <caption className="sr-only">
              Loan installment schedule with payment status
            </caption>
            <thead className="bg-muted-surface">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  #
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Due date
                </th>
                <th scope="col" className="px-3 py-2 font-medium text-right">
                  Payment
                </th>
                <th scope="col" className="px-3 py-2 font-medium text-right">
                  Interest
                </th>
                <th scope="col" className="px-3 py-2 font-medium text-right">
                  Principal
                </th>
                <th scope="col" className="px-3 py-2 font-medium text-right">
                  Balance after
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const isNext = row.scheduleInstallmentId === nextPendingId;
                return (
                  <tr
                    key={row.scheduleInstallmentId}
                    className={cn(
                      "transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)]",
                      isNext &&
                        "bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]",
                    )}
                  >
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {row.installmentNumber}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted">
                      {formatDate(row.dueDate, { omitYearIfCurrent: true })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {formatMinor(row.paymentMinor, loan.currency)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted">
                      {formatMinor(row.interestMinor, loan.currency)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {formatMinor(row.principalMinor, loan.currency)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted">
                      {formatMinor(row.balanceAfterMinor, loan.currency)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Tag className={statusTagClass(row)}>{statusLabel(row)}</Tag>
                      {row.paidWithoutTransaction && row.status === "paid" ? (
                        <span className="ml-2 text-xs text-muted">No ledger entry</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
