import { Suspense } from "react";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { MoneyAnalyticsPageSkeleton } from "@/components/money-analytics-skeleton";
import { auth } from "@/auth";

export default async function MoneyAnalyticsPage() {
  const session = await auth();
  const userSub = session?.user?.id;

  return (
    <Suspense fallback={<MoneyAnalyticsPageSkeleton />}>
      <AnalyticsDashboard userSub={userSub} authenticated={Boolean(userSub)} />
    </Suspense>
  );
}
