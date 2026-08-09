"use client";

import dynamic from "next/dynamic";
import { memo, useMemo, useState, type Ref } from "react";
import { Card } from "@/components/ui/card";
import {
  AnalyticsChartContainer,
  AnalyticsEmptyState,
  CHART_EMPTY_TRANSACTION_ACTIONS,
  ChartViewportFallback,
  DeferredChartLoading,
  type ChartDrilldownHandler,
  type ThemeSlice,
} from "@/components/analytics-chart-card-shared";
import { ChartLegendList } from "@/components/charts/chart-legend-list";
import { colorByIndex } from "@/components/charts/chart-colors";
import { toggleSetKey } from "@/lib/chart-legend-toggle";
import type { MoneyAnalyticsDistributionPayload } from "@/lib/money-services/analytics";
import {
  calendarMonthBounds,
  mergeDrilldownQuery,
  seriesCategoryKeyForDrilldown,
} from "@/lib/analytics-build-query";
import {
  CHART_CARD_HEIGHT_HALF,
  CHART_CARD_LAYOUT,
  CHART_SLOT_CLASS,
} from "@/components/analytics-chart-layout";

const StackedAreaChart = dynamic(
  () =>
    import("@/components/charts/stacked-area-chart").then((m) => ({
      default: m.StackedAreaChart,
    })),
  { ssr: false },
);

export const CategorySpendTrendCard = memo(function CategorySpendTrendCard({
  cardRef,
  inView,
  distribution,
  categoryTrendHasData,
  formatChartValue,
  theme,
  baseFilterQuery,
  onDrilldown,
}: {
  cardRef: Ref<HTMLDivElement | null>;
  inView: boolean;
  distribution: MoneyAnalyticsDistributionPayload | null;
  categoryTrendHasData: boolean;
  formatChartValue: (minor: number) => string;
  theme: ThemeSlice;
  baseFilterQuery?: string;
  onDrilldown?: ChartDrilldownHandler;
}) {
  const { resolved, style } = theme;
  const [hiddenCategoryTrendKeys, setHiddenCategoryTrendKeys] = useState(
    () => new Set<string>(),
  );

  const categoryTrendLegendItems = useMemo(() => {
    if (!distribution) return [];
    const keys = new Set<string>();
    for (const m of distribution.categoryByMonthStacked) {
      for (const s of m.series) keys.add(s.key);
    }
    return [...keys].map((key, i) => {
      const label =
        distribution.categoryByMonthStacked
          .flatMap((m) => m.series)
          .find((s) => s.key === key)?.label ?? key;
      return {
        key,
        label,
        color: colorByIndex(resolved, i, style),
        valueText: "",
      };
    });
  }, [distribution, resolved, style]);

  const handleTrendClick = useMemo(() => {
    if (!baseFilterQuery || !onDrilldown) return undefined;
    return (item: { month: string; key: string; label: string }) => {
      const categoryId = seriesCategoryKeyForDrilldown(item.key);
      if (!categoryId) return;
      const bounds = calendarMonthBounds(item.month);
      onDrilldown({
        title: `${item.label} · ${item.month}`,
        filterQuery: mergeDrilldownQuery(baseFilterQuery, {
          ...bounds,
          categoryIds: [categoryId],
          kinds: ["expense"],
        }),
      });
    };
  }, [baseFilterQuery, onDrilldown]);

  return (
    <Card
      className={`min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`}
      ref={cardRef}
    >
      <h2 className="mb-2 font-display text-lg font-medium">Category spend trend</h2>
      <AnalyticsChartContainer
        legend={
          inView && categoryTrendHasData && categoryTrendLegendItems.length > 0 ? (
            <ChartLegendList
              items={categoryTrendLegendItems}
              hiddenKeys={hiddenCategoryTrendKeys}
              onToggle={(key) =>
                setHiddenCategoryTrendKeys((s) => toggleSetKey(s, key))
              }
              showValues={false}
            />
          ) : undefined
        }
      >
        {inView ? (
          !distribution ? (
            <DeferredChartLoading ariaLabel="Loading category spend trend chart" />
          ) : categoryTrendHasData ? (
            <StackedAreaChart
              data={distribution.categoryByMonthStacked}
              hiddenKeys={hiddenCategoryTrendKeys}
              formatValue={formatChartValue}
              animate={inView}
              onItemClick={handleTrendClick}
            />
          ) : (
            <AnalyticsEmptyState
              title="No category trend in this range"
              description="Add categorized expenses across months."
              minHeightClass="min-h-0"
              className={CHART_SLOT_CLASS}
              {...CHART_EMPTY_TRANSACTION_ACTIONS}
            />
          )
        ) : (
          <ChartViewportFallback ariaLabel="Category spend trend chart loads when this section is visible" />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});

export default CategorySpendTrendCard;
