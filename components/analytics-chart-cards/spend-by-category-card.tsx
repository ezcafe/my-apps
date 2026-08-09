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
import { formatMinor } from "@/lib/format-money";
import type { MoneyAnalyticsDistributionPayload } from "@/lib/money-services/analytics";
import {
  categoryIdForDrilldown,
  mergeDrilldownQuery,
} from "@/lib/analytics-build-query";
import {
  CHART_CARD_HEIGHT_HALF,
  CHART_CARD_LAYOUT,
  CHART_SLOT_CLASS,
} from "@/components/analytics-chart-layout";

const PieByCategoryChart = dynamic(
  () =>
    import("@/components/charts/pie-chart").then((m) => ({
      default: m.PieByCategoryChart,
    })),
  { ssr: false },
);

export const SpendByCategoryCard = memo(function SpendByCategoryCard({
  cardRef,
  inView,
  distribution,
  pieSpendHasData,
  pieSpendTotal,
  formatChartValue,
  theme,
  defaultCurrency,
  baseFilterQuery,
  onDrilldown,
}: {
  cardRef?: Ref<HTMLDivElement | null>;
  inView: boolean;
  distribution: MoneyAnalyticsDistributionPayload | null;
  pieSpendHasData: boolean;
  pieSpendTotal: number;
  formatChartValue: (minor: number) => string;
  theme: ThemeSlice;
  defaultCurrency: string;
  baseFilterQuery?: string;
  onDrilldown?: ChartDrilldownHandler;
}) {
  const { resolved, style } = theme;
  const [hiddenCategories, setHiddenCategories] = useState(() => new Set<string>());
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const legendItems = useMemo(
    () =>
      (distribution?.pieSpend ?? []).slice(0, 8).map((p, i) => ({
        key: p.label,
        label: p.label,
        color: colorByIndex(resolved, i, style),
        valueText: formatMinor(p.valueMinor, defaultCurrency),
      })),
    [distribution?.pieSpend, resolved, style, defaultCurrency],
  );

  const handlePieClick = useMemo(() => {
    if (!baseFilterQuery || !onDrilldown) return undefined;
    return (item: { label: string; categoryId: string | null }) => {
      onDrilldown({
        title: `${item.label} · Spend`,
        filterQuery: mergeDrilldownQuery(baseFilterQuery, {
          categoryIds: [categoryIdForDrilldown(item.categoryId)],
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
      <h2 className="mb-2 font-display text-lg font-medium">Spend by category</h2>
      <AnalyticsChartContainer
        legend={
          inView && pieSpendHasData ? (
            <ChartLegendList
              items={legendItems}
              hiddenKeys={hiddenCategories}
              onToggle={(key) => setHiddenCategories((s) => toggleSetKey(s, key))}
              hoveredKey={hoveredCategory}
              onHover={setHoveredCategory}
              showValues={false}
            />
          ) : undefined
        }
      >
        {inView ? (
          !distribution ? (
            <DeferredChartLoading ariaLabel="Loading spend by category chart" />
          ) : pieSpendHasData ? (
            <PieByCategoryChart
              data={distribution.pieSpend}
              hiddenLabels={hiddenCategories}
              hoveredLabel={hoveredCategory}
              animate={inView}
              formatValue={formatChartValue}
              centerTotalMinor={pieSpendTotal}
              centerLabel="Spent"
              onItemClick={handlePieClick}
            />
          ) : (
            <AnalyticsEmptyState
              title="No category spend in this range"
              description="Add expenses or adjust filters for this range."
              minHeightClass="min-h-0"
              className={CHART_SLOT_CLASS}
              {...CHART_EMPTY_TRANSACTION_ACTIONS}
            />
          )
        ) : (
          <ChartViewportFallback ariaLabel="Spend by category chart loads when this section is visible" />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});

export default SpendByCategoryCard;
