"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { LoanPayActions } from "@/components/loan-pay-actions";
import { Alert } from "@/components/ui/alert";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import { loansDueQueryOptions } from "@/lib/loans-query-options";
import { useLoansWorkspace } from "@/components/loans-workspace-provider";

export function LoansDueBanner() {
  const { workspaceReady } = useLoansWorkspace();
  const { formatDate } = useFormatDate();
  const dueQuery = useQuery({
    ...loansDueQueryOptions(),
    enabled: workspaceReady,
  });

  if (!dueQuery.data?.length) return null;

  return (
    <Alert
      variant="warning"
      title="Payments due"
      description={
        <ul className="space-y-3">
          {dueQuery.data.map((item) => (
            <li
              key={item.scheduleInstallmentId}
              className="@container flex flex-col gap-2 @[28rem]:flex-row @[28rem]:items-center @[28rem]:justify-between"
            >
              <span className="min-w-0">
                <Link
                  href={`/loans/${item.loanId}`}
                  className="font-semibold text-foreground transition-colors duration-150 hover:text-accent"
                >
                  {item.loanName}
                </Link>
                <span className="text-muted">
                  {" "}
                  · #{item.installmentNumber} · due{" "}
                  {formatDate(item.dueDate, { omitYearIfCurrent: true })}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-3 tabular-nums">
                {formatMinor(item.paymentMinor, item.currency)}
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
              </span>
            </li>
          ))}
        </ul>
      }
    />
  );
}
