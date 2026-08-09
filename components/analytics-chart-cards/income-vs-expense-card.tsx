"use client";

import dynamic from "next/dynamic";
import { memo, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  AnalyticsChartContainer,
  AnalyticsEmptyState,
  CHART_EMPTY_TRANSACTION_ACTIONS,
  DeferredChartLoading,
  type ChartDrilldownHandler,
} from "@/components/analytics-chart-card-shared";
import type { MoneyAnalyticsSummaryPayload } from "@/lib/money-services/analytics";
import { mergeDrilldownQuery } from "@/lib/analytics-build-query";
import {
  CHART_CARD_HEIGHT_HALF,
  CHART_CARD_LAYOUT,
  CHART_SLOT_CLASS,
} from "@/components/analytics-chart-layout";

const DivergingBarChart = dynamic(
  () =>
    import("@/components/charts/diverging-bar-chart").then((m) => ({
      default: m.DivergingBarChart,
    })),
  { ssr: false },
);

export const IncomeVsExpenseCard = memo(function IncomeVsExpenseCard({
  overviewReady,
  summaryStats,
  divergingHasData,
  formatChartValue,
  baseFilterQuery,
  onDrilldown,
}: {
  overviewReady: boolean;
  summaryStats: MoneyAnalyticsSummaryPayload["stats"];
  divergingHasData: boolean;
  formatChartValue: (minor: number) => string;
  baseFilterQuery?: string;
  onDrilldown?: ChartDrilldownHandler;
}) {
  const handleDivergingClick = useMemo(() => {
    if (!baseFilterQuery || !onDrilldown) return undefined;
    return (item: { kind: "income" | "expense" }) => {
      onDrilldown({
        title: item.kind === "income" ? "Income" : "Expenses",
        filterQuery: mergeDrilldownQuery(baseFilterQuery, {
          kinds: [item.kind],
        }),
      });
    };
  }, [baseFilterQuery, onDrilldown]);

  return (
    <Card
      className={`w-full min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`}
    >
      <h2 className="mb-2 font-display text-lg font-medium">Income vs expenses</h2>
      <p className="mb-2 text-xs text-muted">Totals for the selected filter range.</p>
      <AnalyticsChartContainer>
        {!overviewReady ? (
          <DeferredChartLoading ariaLabel="Loading income versus expenses chart" />
        ) : divergingHasData ? (
          <DivergingBarChart
            incomeMinor={summaryStats.incomeMinor}
            expenseMinor={summaryStats.expenseMinor}
            formatValue={formatChartValue}
            onItemClick={handleDivergingClick}
          />
        ) : (
          <AnalyticsEmptyState
            title="No income or expenses in this range"
            description="Add transactions or widen the date range."
            minHeightClass="min-h-0"
            className={CHART_SLOT_CLASS}
            {...CHART_EMPTY_TRANSACTION_ACTIONS}
          />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});

export default IncomeVsExpenseCard;
