"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { NetCumulativeFlowCard } from "@/components/analytics-chart-cards";
import { useTheme } from "@/components/theme-provider";
import type { MoneyLedgerPreset } from "@/lib/money-ledger-presets";
import { moneyLedgerAnalyticsOverviewQueryOptions } from "@/lib/money-query-options";
import { useFormatDate } from "@/lib/format-date";
import { useInViewOnce } from "@/lib/use-in-view-once";
import type { MoneyAnalyticsOverviewPayload } from "@/lib/money-services/analytics";

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
