"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { LoansDashboard } from "@/components/loans-dashboard";
import { MoneyAnalyticsFiltersBarSkeleton, MoneyAnalyticsTransactionsTableSkeleton } from "@/components/money-analytics-skeleton";
import { MoneyPageHeader } from "@/components/money-page-header";
import { buttonClassName } from "@/components/ui/button";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { MONEY_LEDGER_LOAN } from "@/lib/money-ledger-presets";

const MoneyTransactionsPageLazy = dynamic(
  () =>
    import("@/components/money-transactions-page").then((mod) => ({
      default: mod.MoneyTransactionsPage,
    })),
  {
    loading: () => (
      <>
        <MoneyAnalyticsFiltersBarSkeleton />
        <MoneyAnalyticsTransactionsTableSkeleton />
      </>
    ),
  },
);

export function MoneyLoansHome({
  userSub,
  authenticated,
}: {
  userSub?: string;
  authenticated: boolean;
}) {
  return (
    <div className={`${MONEY_FULL_SPAN} space-y-8`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MoneyPageHeader
          title="Loans"
          description="Track schedules, due payments, and payoff progress. Loan account transactions appear under Activity below."
        />
        <Link
          href="/money/loans/new"
          className={buttonClassName({ variant: "primary", size: "md" })}
        >
          Create loan
        </Link>
      </div>

      <LoansDashboard />

      <div className="space-y-4 border-t border-border pt-8">
        <MoneyTransactionsPageLazy
          userSub={userSub}
          authenticated={authenticated}
          preset={MONEY_LEDGER_LOAN}
          variant="section"
        />
      </div>
    </div>
  );
}
