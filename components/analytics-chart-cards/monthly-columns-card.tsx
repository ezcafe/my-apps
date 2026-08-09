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
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import { toggleSetKey } from "@/lib/chart-legend-toggle";
import { formatMinor } from "@/lib/format-money";
import type { MoneyAnalyticsOverviewPayload } from "@/lib/money-services/analytics";
import {
  calendarMonthBounds,
  mergeDrilldownQuery,
} from "@/lib/analytics-build-query";
import {
  CHART_CARD_HEIGHT_HALF,
  CHART_CARD_LAYOUT,
  CHART_SLOT_CLASS,
} from "@/components/analytics-chart-layout";

const ColumnChart = dynamic(
  () =>
    import("@/components/charts/column-chart").then((m) => ({
      default: m.ColumnChart,
    })),
  { ssr: false },
);

export const MonthlyColumnsCard = memo(function MonthlyColumnsCard({
  cardRef,
  inView,
  overviewReady,
  overviewColumn,
  columnHasFlow,
  columnExpenseTotal,
  columnIncomeTotal,
  formatChartValue,
  theme,
  defaultCurrency,
  baseFilterQuery,
  onDrilldown,
}: {
  cardRef: Ref<HTMLDivElement | null>;
  inView: boolean;
  overviewReady: boolean;
  overviewColumn: MoneyAnalyticsOverviewPayload["column"];
  columnHasFlow: boolean;
  columnExpenseTotal: number;
  columnIncomeTotal: number;
  formatChartValue: (minor: number) => string;
  theme: ThemeSlice;
  defaultCurrency: string;
  baseFilterQuery?: string;
  onDrilldown?: ChartDrilldownHandler;
}) {
  const { resolved, style } = theme;
  const [hiddenColumnSeries, setHiddenColumnSeries] = useState(
    () => new Set<"expense" | "income">(),
  );

  const columnLegendItems = useMemo(
    () => [
      {
        key: "expense",
        label: "Expense",
        color: chartExpenseColor(resolved, style),
        valueText: formatMinor(columnExpenseTotal, defaultCurrency),
      },
      {
        key: "income",
        label: "Income",
        color: chartIncomeColor(resolved, style),
        valueText: formatMinor(columnIncomeTotal, defaultCurrency),
      },
    ],
    [resolved, style, columnExpenseTotal, columnIncomeTotal, defaultCurrency],
  );

  const handleColumnClick = useMemo(() => {
    if (!baseFilterQuery || !onDrilldown) return undefined;
    return (item: { month: string; series: "income" | "expense" }) => {
      const bounds = calendarMonthBounds(item.month);
      onDrilldown({
        title: `${item.month} · ${item.series === "income" ? "Income" : "Expense"}`,
        filterQuery: mergeDrilldownQuery(baseFilterQuery, {
          ...bounds,
          kinds: [item.series],
        }),
      });
    };
  }, [baseFilterQuery, onDrilldown]);

  return (
    <Card
      className={`min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`}
      ref={cardRef}
    >
      <h2 className="mb-2 font-display text-lg font-medium">
        Monthly expense and income
      </h2>
      <AnalyticsChartContainer
        legend={
          inView && columnHasFlow ? (
            <ChartLegendList
              items={columnLegendItems}
              hiddenKeys={hiddenColumnSeries}
              onToggle={(key) =>
                setHiddenColumnSeries((s) =>
                  toggleSetKey(s, key as "expense" | "income"),
                )
              }
              showValues={false}
            />
          ) : undefined
        }
      >
        {inView ? (
          !overviewReady ? (
            <DeferredChartLoading ariaLabel="Loading monthly expense and income chart" />
          ) : columnHasFlow ? (
            <ColumnChart
              data={overviewColumn}
              hiddenSeries={hiddenColumnSeries}
              animate={inView}
              formatValue={formatChartValue}
              showNetLine
              onItemClick={handleColumnClick}
            />
          ) : (
            <AnalyticsEmptyState
              title="No monthly expense or income to plot"
              description="Add transactions or widen the range to see bars."
              minHeightClass="min-h-0"
              className={CHART_SLOT_CLASS}
              {...CHART_EMPTY_TRANSACTION_ACTIONS}
            />
          )
        ) : (
          <ChartViewportFallback ariaLabel="Monthly expense and income chart loads when this section is visible" />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});

export default MonthlyColumnsCard;
