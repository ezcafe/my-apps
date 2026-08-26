import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { AnalyticsErrorBoundary } from "@/components/analytics-error-boundary";
import { MoneyAnalyticsPageSkeleton } from "@/components/money-analytics-skeleton";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { prefetchMoneyAnalytics } from "@/lib/money-ssr-prefetch";
import { dehydrateMoneyAnalyticsPageState } from "@/lib/money-ssr-seed";

export default async function MoneyInsightsPage() {
  const session = await auth();
  const userSub = session?.user?.id;
  const queryClient = getQueryClient();
  if (userSub) {
    await prefetchMoneyAnalytics(queryClient, userSub);
  }

  return (
    <HydrationBoundary state={dehydrateMoneyAnalyticsPageState(queryClient)}>
      <AnalyticsErrorBoundary>
        <Suspense fallback={<MoneyAnalyticsPageSkeleton />}>
          <AnalyticsDashboard userSub={userSub} authenticated={Boolean(userSub)} />
        </Suspense>
      </AnalyticsErrorBoundary>
    </HydrationBoundary>
  );
}
