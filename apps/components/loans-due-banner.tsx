"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
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
        <ul className="space-y-3">
          {dueQuery.data.map((item) => (
            <li
              key={item.scheduleInstallmentId}
              className="@container flex flex-col gap-2 @[28rem]:flex-row @[28rem]:items-center @[28rem]:justify-between"
            >
              <span>
                <strong>{item.loanName}</strong>
                <span className="text-muted">
                  {" "}
                  · #{item.installmentNumber} · due {item.dueDate}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-3 tabular-nums">
                {formatMinor(item.paymentMinor, item.currency)}
                <Link
                  href={`/money/loans/${item.loanId}`}
                  className={buttonClassName({
                    variant: "secondary",
                    size: "md",
                    className: "min-w-[5rem]",
                  })}
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
