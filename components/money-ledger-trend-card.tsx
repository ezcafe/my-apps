"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import {
  CHART_CARD_HEIGHT_TALL,
  CHART_CARD_LAYOUT,
} from "@/components/analytics-chart-layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/theme-provider";
import type { MoneyLedgerPreset } from "@/lib/money-ledger-presets";
import { moneyLedgerAnalyticsOverviewQueryOptions } from "@/lib/money-query-options";
import { useFormatDate } from "@/lib/format-date";
import { useInViewOnce } from "@/lib/use-in-view-once";
import type { MoneyAnalyticsOverviewPayload } from "@/lib/money-services/analytics";

const NetCumulativeFlowCard = dynamic(
  () => import("@/components/analytics-chart-cards/net-cumulative-flow-card"),
  {
    ssr: false,
    loading: () => (
      <Card
        className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_TALL}`}
      >
        <Skeleton className="mb-2 h-6 w-40 rounded-[var(--radius-sm)]" />
        <Skeleton className="mb-2 h-3 w-56 max-w-full rounded-[var(--radius-sm)]" />
        <Skeleton className="min-h-0 w-full flex-1 rounded-[var(--radius-sm)]" />
      </Card>
    ),
  },
);

export function MoneyLedgerTrendCard({
  preset,
  filterQuery,
  workspaceId,
  defaultCurrency,
  enabled,
}: {
  preset: MoneyLedgerPreset;
  filterQuery: string;
  workspaceId: string;
  defaultCurrency: string;
  enabled: boolean;
}) {
  const { resolved, style } = useTheme();
  const { ref: cardRef, isInView } = useInViewOnce("96px 0px");
  const { formatMonthYear } = useFormatDate();

  const overviewQuery = useQuery({
    ...moneyLedgerAnalyticsOverviewQueryOptions(workspaceId, filterQuery),
    enabled: enabled && isInView && Boolean(workspaceId),
  });

  const overview = (overviewQuery.data ?? null) as MoneyAnalyticsOverviewPayload | null;
  const overviewReady = overviewQuery.isSuccess;
  const overviewLineCompare = overview?.lineCompare;

  const lineHasData = useMemo(
    () =>
      (overview?.line.some((p) => p.netMinor !== 0) ?? false) ||
      (overviewLineCompare?.points.some((p) => p.netMinor !== 0) ?? false),
    [overview?.line, overviewLineCompare?.points],
  );

  const lineCompareLabel = overviewLineCompare
    ? formatMonthYear(overviewLineCompare.fromDate)
    : null;

  const compareDescription =
    overviewLineCompare && lineCompareLabel
      ? `Solid: this month through today. Dashed: ${lineCompareLabel}.`
      : preset.chart.compareHint;

  const theme = useMemo(() => ({ resolved, style }), [resolved, style]);

  return (
    <NetCumulativeFlowCard
      cardRef={cardRef}
      inView={isInView}
      overviewReady={overviewReady}
      overview={overview}
      lineHasData={lineHasData}
      lineCompareLabel={lineCompareLabel}
      isCurrentMonthCompare={Boolean(overviewLineCompare)}
      defaultCurrency={defaultCurrency}
      theme={theme}
      title={preset.chart.title}
      description={preset.chart.description}
      compareDescription={compareDescription}
      emptyState={{
        title: preset.emptyState.title,
        description: preset.emptyState.description,
        primaryAction: preset.emptyState.primaryAction,
        secondaryAction: preset.emptyState.secondaryAction,
      }}
    />
  );
}
