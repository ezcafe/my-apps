import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { InvestmentInsightsDashboard } from "@/components/investment-insights-dashboard";
import { InvestmentErrorBoundary } from "@/components/investment-error-boundary";
import { FeatureInsightsPageSkeleton } from "@/components/money-analytics-skeleton";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { prefetchMoneyInvestmentsHome } from "@/lib/money-ssr-prefetch";
import { dehydrateMoneyInvestmentsPageState } from "@/lib/money-ssr-seed";

export default async function InvestmentsInsightsPage() {
  const session = await auth();
  const userSub = session?.user?.id;
  const queryClient = getQueryClient();
  if (userSub) {
    await prefetchMoneyInvestmentsHome(queryClient, userSub);
  }

  return (
    <HydrationBoundary state={dehydrateMoneyInvestmentsPageState(queryClient)}>
      <InvestmentErrorBoundary>
        <Suspense fallback={<FeatureInsightsPageSkeleton />}>
          <InvestmentInsightsDashboard />
        </Suspense>
      </InvestmentErrorBoundary>
    </HydrationBoundary>
  );
}
