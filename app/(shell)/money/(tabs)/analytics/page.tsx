import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { MoneyAnalyticsPageSkeleton } from "@/components/money-analytics-skeleton";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { prefetchMoneyAnalytics } from "@/lib/money-ssr-prefetch";

export default async function MoneyAnalyticsPage() {
  const session = await auth();
  const userSub = session?.user?.id;
  const queryClient = getQueryClient();
  if (userSub) {
    await prefetchMoneyAnalytics(queryClient, userSub);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<MoneyAnalyticsPageSkeleton />}>
        <AnalyticsDashboard userSub={userSub} authenticated={Boolean(userSub)} />
      </Suspense>
    </HydrationBoundary>
  );
}
