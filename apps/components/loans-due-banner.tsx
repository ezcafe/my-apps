"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { formatMinor } from "@/lib/format-money";
import { loansDueQueryOptions } from "@/lib/loans-query-options";
import { useLoansWorkspace } from "@/components/loans-workspace-provider";

export function LoansDueBanner() {
  const { workspaceReady } = useLoansWorkspace();
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
      <ul className="space-y-2">
        {dueQuery.data.map((item) => (
          <li
            key={item.scheduleInstallmentId}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <span>
              <strong>{item.loanName}</strong>
              <span className="text-muted">
                {" "}
                · #{item.installmentNumber} · due {item.dueDate}
              </span>
            </span>
            <span className="flex items-center gap-3 tabular-nums">
              {formatMinor(item.paymentMinor, item.currency)}
              <Link
                href={`/loans/${item.loanId}`}
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                Pay
              </Link>
            </span>
          </li>
        ))}
      </ul>
      }
    />
  );
}
