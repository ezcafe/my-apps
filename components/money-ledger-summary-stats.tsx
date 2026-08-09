"use client";

import { useQuery } from "@tanstack/react-query";
import { AnalyticsStats } from "@/components/analytics-stats";
import { AnalyticsStatsSkeleton } from "@/components/money-analytics-skeleton";
import { moneyAnalyticsSummaryQueryOptions } from "@/lib/money-query-options";
import type { MoneyAnalyticsSummaryPayload } from "@/lib/money-services/analytics";

export function MoneyLedgerSummaryStats({
  filterQuery,
  workspaceId,
  currency,
  enabled,
}: {
  filterQuery: string;
  workspaceId: string;
  currency: string;
  enabled: boolean;
}) {
  const summaryQuery = useQuery({
    ...moneyAnalyticsSummaryQueryOptions(workspaceId, filterQuery),
    enabled: enabled && Boolean(workspaceId),
  });

  const summary = summaryQuery.data?.moneyAnalyticsSummary as
    | MoneyAnalyticsSummaryPayload
    | undefined;

  if (!summary) {
    return <AnalyticsStatsSkeleton />;
  }

  return (
    <AnalyticsStats
      stats={summary.stats}
      range={summary.range}
      currency={currency}
    />
  );
}
