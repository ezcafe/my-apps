"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MoneyLookupQuickPickSkeleton } from "@/components/money-dashboard-skeleton";
import { MoneyUsageQuickPick } from "@/components/money-usage-quick-pick";
import { Alert } from "@/components/ui/alert";
import { formatMinor, minorToMajorInput } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import {
  loansListQueryOptions,
  type LoanListItem,
} from "@/lib/loans-query-options";
import { toUserFacingMessage } from "@/lib/user-facing-error";

function payableLoans(loans: readonly LoanListItem[]): LoanListItem[] {
  return loans.filter(
    (loan) =>
      loan.status !== "paid_off" &&
      loan.nextScheduleInstallmentId != null &&
      loan.nextInstallmentNumber != null,
  );
}

export function LoanPaymentFields({
  workspaceReady,
  currency,
  selectedLoanId,
  onSelectLoan,
  onPrefillAmount,
}: {
  workspaceReady: boolean;
  currency: string;
  selectedLoanId: string;
  onSelectLoan: (loanId: string, installmentId: string) => void;
  onPrefillAmount: (amountMajor: string) => void;
}) {
  const { formatDate } = useFormatDate();
  const listQuery = useQuery({
    ...loansListQueryOptions(),
    enabled: workspaceReady,
  });
  const options = useMemo(
    () => payableLoans(listQuery.data ?? []),
    [listQuery.data],
  );
  const selected = options.find((l) => l.id === selectedLoanId) ?? null;
  const items = useMemo(
    () => options.map((loan) => ({ id: loan.id, label: loan.name })),
    [options],
  );
  const loanById = useMemo(
    () => new Map(options.map((loan) => [loan.id, loan])),
    [options],
  );

  useEffect(() => {
    if (selectedLoanId && options.some((l) => l.id === selectedLoanId)) return;
    const first = options[0];
    if (!first?.nextScheduleInstallmentId) return;
    onSelectLoan(first.id, first.nextScheduleInstallmentId);
    onPrefillAmount(minorToMajorInput(first.paymentMinor, first.currency));
  }, [options, selectedLoanId, onSelectLoan, onPrefillAmount]);

  if (listQuery.isPending || !workspaceReady) {
    return (
      <MoneyLookupQuickPickSkeleton
        legend="Loan"
        required
        className="[grid-column:1/-1]"
      />
    );
  }

  if (listQuery.isError) {
    return (
      <Alert
        variant="error"
        title="Could not load loans"
        description={toUserFacingMessage(listQuery.error)}
        className="[grid-column:1/-1]"
      />
    );
  }

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted [grid-column:1/-1]">
        No payable installments.{" "}
        <Link
          href="/loans/new"
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          Create a loan
        </Link>{" "}
        first.
      </p>
    );
  }

  return (
    <div className="grid min-w-0 gap-4 [grid-column:1/-1]">
      <MoneyUsageQuickPick
        legend="Loan"
        ariaLabel="Loan"
        required
        items={items}
        selectedId={selectedLoanId}
        onSelect={(id) => {
          const next = loanById.get(id);
          if (!next?.nextScheduleInstallmentId) return;
          onSelectLoan(next.id, next.nextScheduleInstallmentId);
          onPrefillAmount(
            minorToMajorInput(next.paymentMinor, next.currency),
          );
        }}
        otherLabel="Other loan"
        searchPlaceholder="Search loans…"
        renderPickerRow={(item) => {
          const loan = loanById.get(item.id);
          if (!loan) return null;
          return formatMinor(loan.paymentMinor, loan.currency || currency);
        }}
      />
      {selected ? (
        <p className="text-sm text-muted">
          Installment #{selected.nextInstallmentNumber}
          {selected.nextDueDate
            ? ` · due ${formatDate(selected.nextDueDate, { omitYearIfCurrent: true })}`
            : ""}
          {" · scheduled "}
          {formatMinor(selected.paymentMinor, selected.currency || currency)}
        </p>
      ) : null}
    </div>
  );
}
