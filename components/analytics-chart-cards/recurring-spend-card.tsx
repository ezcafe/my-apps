"use client";

import dynamic from "next/dynamic";
import { memo, useMemo, type Ref } from "react";
import { Card } from "@/components/ui/card";
import {
  AnalyticsChartContainer,
  AnalyticsEmptyState,
  ChartViewportFallback,
  DeferredChartLoading,
  type ChartDrilldownHandler,
} from "@/components/analytics-chart-card-shared";
import type { MoneyAnalyticsLeadersPayload } from "@/lib/money-services/analytics";
import { mergeDrilldownQuery } from "@/lib/analytics-build-query";
import {
  CHART_CARD_HEIGHT_FULL,
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

export const RecurringSpendCard = memo(function RecurringSpendCard({
  cardRef,
  inView,
  leaders,
  recurringHasData,
  formatChartValue,
  baseFilterQuery,
  onDrilldown,
}: {
  cardRef: Ref<HTMLDivElement | null>;
  inView: boolean;
  leaders: MoneyAnalyticsLeadersPayload | null;
  recurringHasData: boolean;
  formatChartValue: (minor: number) => string;
  baseFilterQuery?: string;
  onDrilldown?: ChartDrilldownHandler;
}) {
  const recurringBarData = useMemo(
    () =>
      (leaders?.recurringSpend ?? []).map((r, i) => ({
        key: r.templateId ?? `r-${i}`,
        label: r.label,
        valueMinor: r.valueMinor,
        templateId: r.templateId,
      })),
    [leaders?.recurringSpend],
  );

  const handleBarClick = useMemo(() => {
    if (!baseFilterQuery || !onDrilldown) return undefined;
    return (item: { key: string; label: string }) => {
      const row = recurringBarData.find((d) => d.key === item.key);
      if (!row?.templateId) return;
      onDrilldown({
        title: `${item.label} · Recurring spend`,
        filterQuery: mergeDrilldownQuery(baseFilterQuery, {
          recurrenceSourceIds: [row.templateId],
          kinds: ["expense"],
        }),
      });
    };
  }, [baseFilterQuery, onDrilldown, recurringBarData]);

  return (
    <Card
      className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_FULL}`}
      ref={cardRef}
    >
      <h2 className="mb-2 font-display text-lg font-medium">Recurring spend</h2>
      <p className="mb-2 text-xs text-muted">
        Expenses posted from recurrence templates in this range.
      </p>
      <AnalyticsChartContainer>
        {!inView ? (
          <ChartViewportFallback ariaLabel="Recurring spend chart loads when this section is visible" />
        ) : !leaders ? (
          <DeferredChartLoading ariaLabel="Loading recurring spend chart" />
        ) : recurringHasData ? (
          <HorizontalBarChart
            data={recurringBarData}
            formatValue={formatChartValue}
            animate={inView}
            onItemClick={handleBarClick}
          />
        ) : (
          <AnalyticsEmptyState
            title="No recurring spend in this range"
            description="Generated transactions from templates appear here."
            minHeightClass="min-h-0"
            className={CHART_SLOT_CLASS}
            action={{ href: "/money/settings/recurrence", label: "Recurrence settings" }}
          />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});

export default RecurringSpendCard;
