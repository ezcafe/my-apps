"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { LoansDueBanner } from "@/components/loans-due-banner";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinor } from "@/lib/format-money";
import { loansListQueryOptions } from "@/lib/loans-query-options";
import { useLoansWorkspace } from "@/components/loans-workspace-provider";

export function LoansDashboard() {
  const { workspaceReady } = useLoansWorkspace();
  const listQuery = useQuery({
    ...loansListQueryOptions(),
    enabled: workspaceReady,
  });

  return (
    <div className="min-w-0 max-w-4xl space-y-6">
      <LoansDueBanner />

      {listQuery.isLoading ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : null}

      {listQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {listQuery.error instanceof Error
            ? listQuery.error.message
            : "Could not load loans"}
        </p>
      ) : null}

      {listQuery.isSuccess && listQuery.data.length === 0 ? (
        <Card className="p-6">
          <p className="text-muted">No active loans yet.</p>
          <Link
            href="/loans/new"
            className="mt-3 inline-block font-medium text-foreground underline-offset-2 hover:underline"
          >
            Create your first loan
          </Link>
        </Card>
      ) : null}

      {listQuery.isSuccess && listQuery.data.length > 0 ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]">
          {listQuery.data.map((loan) => (
            <Link key={loan.id} href={`/loans/${loan.id}`} className="fx-press block">
              <Card className="h-full p-5 transition-[border-color,box-shadow] duration-200 hover:border-accent/40 hover:shadow-[var(--shadow-sm)]">
                <h2 className="text-lg font-semibold">{loan.name}</h2>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Monthly</dt>
                    <dd className="tabular-nums">
                      {formatMinor(loan.paymentMinor, loan.currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Remaining</dt>
                    <dd className="tabular-nums">
                      {formatMinor(loan.remainingMinor, loan.currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Progress</dt>
                    <dd className="tabular-nums">
                      {loan.percentComplete.toFixed(1)}%
                    </dd>
                  </div>
                  {loan.nextDueDate ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted">Next due</dt>
                      <dd>{loan.nextDueDate}</dd>
                    </div>
                  ) : null}
                </dl>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
