"use client";

import { useQuery } from "@tanstack/react-query";
import {
  InvestmentHoldingsTable,
  InvestmentOpenActivitiesTable,
} from "@/components/investment-insights-tables";
import { InvestmentTableSectionSkeleton } from "@/components/investment-page-skeleton";
import { MoneyTransactionsPage } from "@/components/money-transactions-page";
import { useInvestmentWorkspace } from "@/components/investment-workspace-provider";
import { MONEY_LEDGER_INVESTMENT } from "@/lib/money-ledger-presets";
import { MONEY_DASHBOARD_STACK, MONEY_FULL_SPAN } from "@/lib/money-layout";
import { cn } from "@/lib/cn";
import {
  investmentHoldingsQueryOptions,
  investmentOpenActivitiesQueryOptions,
} from "@/lib/investment-query-options";

export function InvestmentOverviewPage({
  userSub,
  authenticated,
}: {
  userSub?: string;
  authenticated: boolean;
}) {
  const { workspaceReady } = useInvestmentWorkspace();
  const holdingsQuery = useQuery({
    ...investmentHoldingsQueryOptions(),
    enabled: workspaceReady,
  });
  const openQuery = useQuery({
    ...investmentOpenActivitiesQueryOptions(),
    enabled: workspaceReady,
  });

  return (
    <div className={cn(MONEY_FULL_SPAN, MONEY_DASHBOARD_STACK)}>
      <section aria-label="Portfolio snapshot" className="grid gap-3 md:grid-cols-2">
        {holdingsQuery.isLoading ? (
          <InvestmentTableSectionSkeleton titleWidthClass="w-24" />
        ) : holdingsQuery.isSuccess ? (
          <InvestmentHoldingsTable holdings={holdingsQuery.data} />
        ) : null}
        <InvestmentOpenActivitiesTable query={openQuery} />
      </section>

      <MoneyTransactionsPage
        userSub={userSub}
        authenticated={authenticated}
        preset={MONEY_LEDGER_INVESTMENT}
        showSummaryStats
      />
    </div>
  );
}
