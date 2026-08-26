import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { LoanErrorBoundary } from "@/components/loan-error-boundary";
import { LoansInsightsDashboard } from "@/components/loans-insights-dashboard";
import { FeatureInsightsPageSkeleton } from "@/components/money-analytics-skeleton";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { prefetchLoansInsights } from "@/lib/money-ssr-prefetch";
import { dehydrateLoansInsightsPageState } from "@/lib/money-ssr-seed";

export default async function LoansInsightsPage() {
  const session = await auth();
  const userSub = session?.user?.id;
  const queryClient = getQueryClient();
  if (userSub) {
    await prefetchLoansInsights(queryClient, userSub);
  }

  return (
    <HydrationBoundary state={dehydrateLoansInsightsPageState(queryClient)}>
      <LoanErrorBoundary>
        <Suspense fallback={<FeatureInsightsPageSkeleton />}>
          <LoansInsightsDashboard />
        </Suspense>
      </LoanErrorBoundary>
    </HydrationBoundary>
  );
}
