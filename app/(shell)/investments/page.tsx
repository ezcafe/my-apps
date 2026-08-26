import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { InvestmentOverviewPage } from "@/components/investment-overview-page";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import {
  prefetchInvestmentOverview,
  prefetchMoneyLedger,
} from "@/lib/money-ssr-prefetch";
import { MONEY_LEDGER_INVESTMENT } from "@/lib/money-ledger-presets";

export default async function InvestmentsPage() {
  const session = await auth();
  const userSub = session?.user?.id;
  const queryClient = getQueryClient();
  if (userSub) {
    await Promise.all([
      prefetchMoneyLedger(queryClient, MONEY_LEDGER_INVESTMENT, userSub, {
        includeSummary: true,
      }),
      prefetchInvestmentOverview(queryClient, userSub),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InvestmentOverviewPage
        userSub={userSub}
        authenticated={Boolean(userSub)}
      />
    </HydrationBoundary>
  );
}
