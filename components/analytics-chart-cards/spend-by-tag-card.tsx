"use client";

import dynamic from "next/dynamic";
import { memo, useMemo, type Ref } from "react";
import { Card } from "@/components/ui/card";
import {
  AnalyticsChartContainer,
  AnalyticsEmptyState,
  CHART_EMPTY_TRANSACTION_ACTIONS,
  ChartViewportFallback,
  DeferredChartLoading,
  type ChartDrilldownHandler,
} from "@/components/analytics-chart-card-shared";
import type { MoneyAnalyticsLeadersPayload } from "@/lib/money-services/analytics";
import { mergeDrilldownQuery } from "@/lib/analytics-build-query";
import {
  CHART_CARD_HEIGHT_HALF,
  CHART_CARD_LAYOUT,
  CHART_SLOT_CLASS,
} from "@/components/analytics-chart-layout";

const HorizontalBarChart = dynamic(
  () =>
    import("@/components/charts/horizontal-bar-chart").then((m) => ({
      default: m.HorizontalBarChart,
    })),
  { ssr: false },
);

export const SpendByTagCard = memo(function SpendByTagCard({
  cardRef,
  inView,
  leaders,
  tagsHasData,
  formatChartValue,
  baseFilterQuery,
  onDrilldown,
}: {
  cardRef: Ref<HTMLDivElement | null>;
  inView: boolean;
  leaders: MoneyAnalyticsLeadersPayload | null;
  tagsHasData: boolean;
  formatChartValue: (minor: number) => string;
  baseFilterQuery?: string;
  onDrilldown?: ChartDrilldownHandler;
}) {
  const tagBarData = useMemo(
    () =>
      (leaders?.tagsSpend ?? []).map((t, i) => ({
        key: t.tagId ?? `t-${i}-${t.label}`,
        label: t.label,
        valueMinor: t.valueMinor,
        tagId: t.tagId,
      })),
    [leaders?.tagsSpend],
  );

  const handleBarClick = useMemo(() => {
    if (!baseFilterQuery || !onDrilldown) return undefined;
    return (item: { key: string; label: string }) => {
      const row = tagBarData.find((d) => d.key === item.key);
      if (!row?.tagId) return;
      onDrilldown({
        title: `${item.label} · Tag spend`,
        filterQuery: mergeDrilldownQuery(baseFilterQuery, {
          tagIds: [row.tagId],
          kinds: ["expense"],
        }),
      });
    };
  }, [baseFilterQuery, onDrilldown, tagBarData]);

  return (
    <Card
      className={`min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`}
      ref={cardRef}
    >
      <h2 className="mb-2 font-display text-lg font-medium">Spend by tag</h2>
      <AnalyticsChartContainer>
        {inView ? (
          !leaders ? (
            <DeferredChartLoading ariaLabel="Loading spend by tag chart" />
          ) : tagsHasData ? (
            <HorizontalBarChart
              data={tagBarData}
              formatValue={formatChartValue}
              animate={inView}
              onItemClick={handleBarClick}
            />
          ) : (
            <AnalyticsEmptyState
              title="No tag spend in this range"
              description="Add expenses or widen the range."
              minHeightClass="min-h-0"
              className={CHART_SLOT_CLASS}
              {...CHART_EMPTY_TRANSACTION_ACTIONS}
            />
          )
        ) : (
          <ChartViewportFallback ariaLabel="Spend by tag chart loads when this section is visible" />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});

export default SpendByTagCard;
