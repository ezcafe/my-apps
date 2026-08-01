"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { InvestmentDashboard } from "@/components/investment-dashboard";
import { MoneyAnalyticsFiltersBarSkeleton, MoneyAnalyticsTransactionsTableSkeleton } from "@/components/money-analytics-skeleton";
import { buttonClassName } from "@/components/ui/button";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { MONEY_LEDGER_INVESTMENT } from "@/lib/money-ledger-presets";

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

export function MoneyInvestmentsHome({
  userSub,
  authenticated,
}: {
  userSub?: string;
  authenticated: boolean;
}) {
  return (
    <div className={`${MONEY_FULL_SPAN} space-y-8`}>
      <div className="flex justify-end">
        <Link
          href="/money/investments/new"
          className={buttonClassName({ variant: "primary", size: "md" })}
        >
          Record activity
        </Link>
      </div>

      <InvestmentDashboard />

      <div className="space-y-4 border-t border-border pt-8">
        <MoneyTransactionsPageLazy
          userSub={userSub}
          authenticated={authenticated}
          preset={MONEY_LEDGER_INVESTMENT}
          variant="section"
        />
      </div>
    </div>
  );
}
