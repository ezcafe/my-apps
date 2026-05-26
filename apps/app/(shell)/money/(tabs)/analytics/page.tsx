"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { MoneyAnalyticsPageSkeleton } from "@/components/money-analytics-skeleton";

const AnalyticsDashboardLazy = dynamic(
  () =>
    import("@/components/analytics-dashboard").then((mod) => ({
      default: mod.AnalyticsDashboard,
    })),
  { ssr: false, loading: () => <MoneyAnalyticsPageSkeleton /> },
);

export default function MoneyAnalyticsPage() {
  return (
    <Suspense fallback={<MoneyAnalyticsPageSkeleton />}>
      <AnalyticsDashboardLazy />
    </Suspense>
  );
}
