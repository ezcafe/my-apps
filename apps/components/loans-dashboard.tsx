"use client";

import { queryErrorMessage } from "@/lib/user-facing-error";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  getLoansTodayIso,
  LoanListCard,
  LoansOverviewSummary,
} from "@/components/loan-list-card";
import { LoansDueBanner } from "@/components/loans-due-banner";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { loansListQueryOptions } from "@/lib/loans-query-options";
import {
  useLoansWorkspace,
} from "@/components/loans-workspace-provider";

export function LoansDashboard() {
  const { workspaceReady, defaultCurrency } = useLoansWorkspace();
  const listQuery = useQuery({
    ...loansListQueryOptions(),
    enabled: workspaceReady,
  });
  const todayIso = getLoansTodayIso();
  const currency = defaultCurrency ?? "USD";

  return (
    <div className="col-span-2 min-w-0 space-y-6 md:col-span-6 lg:col-span-12">
      <LoansDueBanner />

      {listQuery.isLoading ? (
        <>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]">
            <Skeleton className="h-52" />
            <Skeleton className="h-52" />
          </div>
        </>
      ) : null}

      {listQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {queryErrorMessage(listQuery.error) ?? "Could not load loans"}
        </p>
      ) : null}

      {listQuery.isSuccess && listQuery.data.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted">No active loans yet.</p>
          <Link
            href="/loans/new"
            className="mt-4 inline-block font-medium text-foreground underline-offset-2 transition-colors duration-150 hover:underline"
          >
            Create your first loan
          </Link>
        </Card>
      ) : null}

      {listQuery.isSuccess && listQuery.data.length > 0 ? (
        <>
          <LoansOverviewSummary loans={listQuery.data} currency={currency} />
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))] fx-stagger-children">
            {listQuery.data.map((loan) => (
              <LoanListCard key={loan.id} loan={loan} todayIso={todayIso} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
