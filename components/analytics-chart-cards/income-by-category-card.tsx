"use client";

import dynamic from "next/dynamic";
import { memo, useMemo, useState } from "react";
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
import { formatCompactMinor } from "@/lib/format-money";
import type { MoneyAnalyticsDistributionPayload } from "@/lib/money-services/analytics";
import {
  categoryIdForDrilldown,
  mergeDrilldownQuery,
  seriesCategoryKeyForDrilldown,
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

export const IncomeByCategoryCard = memo(function IncomeByCategoryCard({
  inView,
  distribution,
  pieIncomeHasData,
  pieIncomeTotal,
  formatChartValue,
  theme,
  defaultCurrency,
  baseFilterQuery,
  onDrilldown,
}: {
  inView: boolean;
  distribution: MoneyAnalyticsDistributionPayload | null;
  pieIncomeHasData: boolean;
  pieIncomeTotal: number;
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
      (distribution?.pieIncome ?? []).map((p, i) => ({
        key: p.label,
        label: p.label,
        color: colorByIndex(resolved, i, style),
        valueText: formatCompactMinor(p.valueMinor, defaultCurrency),
      })),
    [distribution?.pieIncome, resolved, style, defaultCurrency],
  );

  const handlePieClick = useMemo(() => {
    if (!baseFilterQuery || !onDrilldown) return undefined;
    return (item: { label: string; categoryId: string | null }) => {
      const seriesKey = item.categoryId ?? "uncategorized";
      if (seriesCategoryKeyForDrilldown(seriesKey) == null) return;
      onDrilldown({
        title: `${item.label} · Income`,
        filterQuery: mergeDrilldownQuery(baseFilterQuery, {
          categoryIds: [categoryIdForDrilldown(item.categoryId)],
          kinds: ["income"],
        }),
      });
    };
  }, [baseFilterQuery, onDrilldown]);

  return (
    <Card className={`min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`}>
      <h2 className="mb-2 font-display text-lg font-medium">Income by category</h2>
      <AnalyticsChartContainer
        legend={
          inView && pieIncomeHasData ? (
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
        {!inView ? (
          <ChartViewportFallback ariaLabel="Income by category chart loads when this section is visible" />
        ) : !distribution ? (
          <DeferredChartLoading ariaLabel="Loading income by category chart" />
        ) : pieIncomeHasData ? (
          <PieByCategoryChart
            data={distribution.pieIncome}
            hiddenLabels={hiddenCategories}
            hoveredLabel={hoveredCategory}
            animate={inView}
            formatValue={formatChartValue}
            centerTotalMinor={pieIncomeTotal}
            centerLabel="Earned"
            onItemClick={handlePieClick}
          />
        ) : (
          <AnalyticsEmptyState
            title="No category income in this range"
            description="Add income or adjust filters for this range."
            minHeightClass="min-h-0"
            className={CHART_SLOT_CLASS}
            {...CHART_EMPTY_TRANSACTION_ACTIONS}
          />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});

export default IncomeByCategoryCard;
