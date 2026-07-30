"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getLoansTodayIso,
  LoanListCard,
  LoansOverviewSummary,
} from "@/components/loan-list-card";
import { LoansDueBanner } from "@/components/loans-due-banner";
import { MoneyEmptyState, MoneyListSkeleton, MoneyQueryErrorAlert } from "@/components/money-feedback";
import { loansListQueryOptions } from "@/lib/loans-query-options";
import { useLoansWorkspace } from "@/components/loans-workspace-provider";

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
          <MoneyListSkeleton variant="summaryTiles" />
          <MoneyListSkeleton variant="cardGrid" />
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
          primaryAction={{ href: "/money/loans/new", label: "Create your first loan" }}
        />
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
