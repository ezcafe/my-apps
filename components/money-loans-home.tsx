"use client";

import dynamic from "next/dynamic";
import { LoansDashboard } from "@/components/loans-dashboard";
import { MoneyAnalyticsFiltersBarSkeleton, MoneyAnalyticsTransactionsTableSkeleton } from "@/components/money-analytics-skeleton";
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
        <MoneyAnalyticsTransactionsTableSkeleton selectable />
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
