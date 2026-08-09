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

export const TopMerchantsCard = memo(function TopMerchantsCard({
  cardRef,
  inView,
  leaders,
  merchantsHasData,
  formatChartValue,
  baseFilterQuery,
  onDrilldown,
}: {
  cardRef: Ref<HTMLDivElement | null>;
  inView: boolean;
  leaders: MoneyAnalyticsLeadersPayload | null;
  merchantsHasData: boolean;
  formatChartValue: (minor: number) => string;
  baseFilterQuery?: string;
  onDrilldown?: ChartDrilldownHandler;
}) {
  const merchantBarData = useMemo(
    () =>
      (leaders?.merchantsSpend ?? []).map((m, i) => ({
        key: m.merchantId ?? `m-${i}-${m.label}`,
        label: m.label,
        valueMinor: m.valueMinor,
        merchantId: m.merchantId,
      })),
    [leaders?.merchantsSpend],
  );

  const handleBarClick = useMemo(() => {
    if (!baseFilterQuery || !onDrilldown) return undefined;
    return (item: { key: string; label: string }) => {
      const row = merchantBarData.find((d) => d.key === item.key);
      if (!row?.merchantId) return;
      onDrilldown({
        title: `${item.label} · Merchant spend`,
        filterQuery: mergeDrilldownQuery(baseFilterQuery, {
          merchantIds: [row.merchantId],
          kinds: ["expense"],
        }),
      });
    };
  }, [baseFilterQuery, onDrilldown, merchantBarData]);

  return (
    <Card
      className={`min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`}
      ref={cardRef}
    >
      <h2 className="mb-2 font-display text-lg font-medium">Top merchants</h2>
      <AnalyticsChartContainer>
        {inView ? (
          !leaders ? (
            <DeferredChartLoading ariaLabel="Loading top merchants chart" />
          ) : merchantsHasData ? (
            <HorizontalBarChart
              data={merchantBarData}
              formatValue={formatChartValue}
              animate={inView}
              onItemClick={handleBarClick}
            />
          ) : (
            <AnalyticsEmptyState
              title="No merchant spend in this range"
              description="Add expenses or widen the range."
              minHeightClass="min-h-0"
              className={CHART_SLOT_CLASS}
              {...CHART_EMPTY_TRANSACTION_ACTIONS}
            />
          )
        ) : (
          <ChartViewportFallback ariaLabel="Top merchants chart loads when this section is visible" />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});

export default TopMerchantsCard;
