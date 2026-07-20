"use client";

import dynamic from "next/dynamic";
import { memo, useMemo, useState, type Ref } from "react";
import type { ReactNode } from "react";
import { AnalyticsEmptyState } from "@/components/analytics-empty-state";
import { ChartLegendList } from "@/components/charts/chart-legend-list";
import { colorByIndex } from "@/components/charts/chart-colors";
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import { DivergingBarChart } from "@/components/charts/diverging-bar-chart";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toggleSetKey } from "@/lib/chart-legend-toggle";
import { formatMinor } from "@/lib/format-money";
import type {
  MoneyAnalyticsBudgetPayload,
  MoneyAnalyticsDistributionPayload,
  MoneyAnalyticsLeadersPayload,
  MoneyAnalyticsOverviewPayload,
  MoneyAnalyticsSankeyPayload,
  MoneyAnalyticsSummaryPayload,
} from "@/lib/money-services/analytics";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";
import { budgetRowsForChart } from "@/lib/analytics-budget-label";
import {
  categoryIdForDrilldown,
  mergeDrilldownQuery,
  type AnalyticsChartDrilldownPayload,
} from "@/lib/analytics-build-query";
import type { StylePreset } from "@/components/theme-provider";
import type {
  AnalyticsLookupAccount,
  AnalyticsLookupTag,
} from "@/components/analytics-filters";

const CHART_EMPTY_TRANSACTION_ACTIONS = {
  action: { href: "/money/transactions", label: "View transactions" },
  secondaryAction: { href: "/money", label: "Add transaction" },
} as const;

const LineChart = dynamic(
  () =>
    import("@/components/charts/line-chart").then((m) => ({
      default: m.LineChart,
    })),
  { ssr: false },
);

const ColumnChart = dynamic(
  () =>
    import("@/components/charts/column-chart").then((m) => ({
      default: m.ColumnChart,
    })),
  { ssr: false },
);

const PieByCategoryChart = dynamic(
  () =>
    import("@/components/charts/pie-chart").then((m) => ({
      default: m.PieByCategoryChart,
    })),
  { ssr: false },
);

const SankeyChart = dynamic(
  () =>
    import("@/components/charts/sankey-chart").then((m) => ({
      default: m.SankeyChart,
    })),
  { ssr: false },
);

const HorizontalBarChart = dynamic(
  () =>
    import("@/components/charts/horizontal-bar-chart").then((m) => ({
      default: m.HorizontalBarChart,
    })),
  { ssr: false },
);

const StackedAreaChart = dynamic(
  () =>
    import("@/components/charts/stacked-area-chart").then((m) => ({
      default: m.StackedAreaChart,
    })),
  { ssr: false },
);

export const CHART_CARD_HEIGHT_FULL = "h-[260px] min-h-[260px] max-h-[260px]";
export const CHART_CARD_HEIGHT_HALF = "h-[280px] min-h-[280px] max-h-[280px]";
export const CHART_CARD_HEIGHT_TALL = "h-[360px] min-h-[360px] max-h-[360px]";
export const CHART_CARD_MIN_HEIGHT_HALF_PX = 280;
export const CHART_CARD_LAYOUT = "flex flex-col";
export const CHART_SLOT_CLASS = "h-full min-h-0 overflow-hidden";

const LEGEND_GRID_DEFAULT =
  "grid-cols-1 grid-rows-[minmax(0,1fr)_auto] md:grid-rows-1 md:[grid-template-columns:minmax(0,20%)_minmax(0,80%)]";
const LEGEND_GRID_COMPACT =
  "grid-cols-1 grid-rows-[minmax(0,1fr)_auto] md:grid-rows-1 md:[grid-template-columns:minmax(0,5.5rem)_minmax(0,1fr)]";

export function AnalyticsChartContainer({
  className,
  legend,
  legendLayout = "default",
  children,
}: {
  className?: string;
  legend?: ReactNode;
  /** `compact` uses a fixed narrow legend column for short labels. */
  legendLayout?: "default" | "compact";
  children: ReactNode;
}) {
  const chartSlot = (
    <div
      className={[
        "relative h-full min-h-0 min-w-0 place-self-center overflow-hidden w-full",
        legend ? "order-1 md:order-2" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="absolute inset-0 min-h-0 min-w-0">{children}</div>
    </div>
  );

  if (!legend) {
    return (
      <div
        className={[
          "analytics-chart-container grid min-h-0 w-full flex-1 overflow-hidden grid-cols-[minmax(0,1fr)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {chartSlot}
      </div>
    );
  }

  return (
    <div
      className={[
        "analytics-chart-container grid min-h-0 w-full flex-1 overflow-hidden",
        legendLayout === "compact" ? LEGEND_GRID_COMPACT : LEGEND_GRID_DEFAULT,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {chartSlot}
      <div className="analytics-chart-legend-slot order-2 min-h-0 min-w-0 max-md:overflow-x-auto max-md:overscroll-x-contain border-t border-border/60 pt-2 md:order-1 md:overflow-y-auto md:overscroll-contain md:border-t-0 md:border-r md:pt-0 md:pr-2">
        {legend}
      </div>
    </div>
  );
}

export function ChartViewportFallback({ ariaLabel }: { ariaLabel: string }) {
  return (
    <Skeleton
      className="flex h-full w-full min-h-0 min-w-0 items-center justify-center text-xs text-muted"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      Chart loads when visible
    </Skeleton>
  );
}

export function DeferredChartLoading({ ariaLabel }: { ariaLabel: string }) {
  return (
    <Skeleton
      className="flex h-full w-full min-h-0 min-w-0 items-center justify-center text-xs text-muted"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      Loading chart data…
    </Skeleton>
  );
}

type ThemeSlice = {
  resolved: "light" | "dark";
  style: StylePreset;
};

export const NetCumulativeFlowCard = memo(function NetCumulativeFlowCard({
  cardRef,
  inView,
  overviewReady,
  overview,
  lineHasData,
  lineCompareLabel,
  isCurrentMonthCompare,
  defaultCurrency,
  theme,
}: {
  cardRef: Ref<HTMLDivElement | null>;
  inView: boolean;
  overviewReady: boolean;
  overview: MoneyAnalyticsOverviewPayload | null;
  lineHasData: boolean;
  lineCompareLabel: string | null;
  isCurrentMonthCompare: boolean;
  defaultCurrency: string;
  theme: ThemeSlice;
}) {
  const { resolved, style } = theme;
  const overviewLine = overview?.line ?? [];
  const overviewLineCompare = overview?.lineCompare;
  const overviewLineMode = overview?.lineMode ?? "date";
  const [hiddenLineSeries, setHiddenLineSeries] = useState(
    () => new Set<"primary" | "compare">(),
  );

  const linePrimaryColor = useMemo(() => {
    const last = overviewLine[overviewLine.length - 1]?.netMinor ?? 0;
    return last < 0
      ? chartExpenseColor(resolved, style)
      : chartIncomeColor(resolved, style);
  }, [overviewLine, resolved, style]);

  const lineLegendItems = useMemo(() => {
    const items = [
      {
        key: "primary",
        label: isCurrentMonthCompare ? "This month" : "Selected range",
        color: linePrimaryColor,
        valueText: formatMinor(
          overviewLine[overviewLine.length - 1]?.netMinor ?? 0,
          defaultCurrency,
        ),
      },
    ];
    if (overviewLineCompare && lineCompareLabel) {
      const compareLast =
        overviewLineCompare.points[overviewLineCompare.points.length - 1]
          ?.netMinor ?? 0;
      items.push({
        key: "compare",
        label: lineCompareLabel,
        color: "var(--muted)",
        valueText: formatMinor(compareLast, defaultCurrency),
      });
    }
    return items;
  }, [
    overviewLine,
    overviewLineCompare,
    lineCompareLabel,
    linePrimaryColor,
    defaultCurrency,
    isCurrentMonthCompare,
  ]);

  return (
    <Card
      className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_TALL}`}
      ref={cardRef}
    >
      <h2 className="mb-2 font-display text-lg font-medium">Net cumulative flow</h2>
      {overviewLineCompare ? (
        <p className="mb-2 text-xs text-muted">
          Solid: this month through today. Dashed: {lineCompareLabel}.
        </p>
      ) : (
        <p className="mb-2 text-xs text-muted">
          Cumulative income minus expenses for the selected range.
        </p>
      )}
      <AnalyticsChartContainer
        legend={
          lineHasData && inView ? (
            <ChartLegendList
              items={lineLegendItems}
              hiddenKeys={hiddenLineSeries}
              onToggle={(key) =>
                setHiddenLineSeries((s) =>
                  toggleSetKey(s, key as "primary" | "compare"),
                )
              }
              showValues={false}
            />
          ) : undefined
        }
      >
        {inView ? (
          !overviewReady ? (
            <DeferredChartLoading ariaLabel="Loading net cumulative flow chart" />
          ) : lineHasData ? (
            <LineChart
              data={overviewLine}
              comparison={
                overviewLineCompare && lineCompareLabel
                  ? {
                      label: lineCompareLabel,
                      data: overviewLineCompare.points,
                    }
                  : undefined
              }
              xMode={overviewLineMode}
              formatY={(minor) => formatMinor(minor, defaultCurrency)}
              hiddenSeries={hiddenLineSeries}
              animate={inView}
            />
          ) : (
            <AnalyticsEmptyState
              title="No cash flow in this range"
              description="Widen the range or add transactions."
              descriptionClassName="line-clamp-1"
              minHeightClass="min-h-0"
              className={CHART_SLOT_CLASS}
              {...CHART_EMPTY_TRANSACTION_ACTIONS}
            />
          )
        ) : (
          <ChartViewportFallback ariaLabel="Net cumulative flow chart loads when this section is visible" />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});

export const IncomeVsExpenseCard = memo(function IncomeVsExpenseCard({
  overviewReady,
  summaryStats,
  divergingHasData,
  formatChartValue,
}: {
  overviewReady: boolean;
  summaryStats: MoneyAnalyticsSummaryPayload["stats"];
  divergingHasData: boolean;
  formatChartValue: (minor: number) => string;
}) {
  return (
    <Card
      className={`col-span-2 w-full min-w-0 p-4 md:col-span-3 lg:col-span-6 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`}
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

export type ChartDrilldownHandler = (payload: AnalyticsChartDrilldownPayload) => void;

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
  cardRef: Ref<HTMLDivElement | null>;
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
      (distribution?.pieIncome ?? []).slice(0, 8).map((p, i) => ({
        key: p.label,
        label: p.label,
        color: colorByIndex(resolved, i, style),
        valueText: formatMinor(p.valueMinor, defaultCurrency),
      })),
    [distribution?.pieIncome, resolved, style, defaultCurrency],
  );

  const handlePieClick = useMemo(() => {
    if (!baseFilterQuery || !onDrilldown) return undefined;
    return (item: { label: string; categoryId: string | null }) => {
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

export const CategorySpendTrendCard = memo(function CategorySpendTrendCard({
  cardRef,
  inView,
  distribution,
  categoryTrendHasData,
  formatChartValue,
  theme,
}: {
  cardRef: Ref<HTMLDivElement | null>;
  inView: boolean;
  distribution: MoneyAnalyticsDistributionPayload | null;
  categoryTrendHasData: boolean;
  formatChartValue: (minor: number) => string;
  theme: ThemeSlice;
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

export const BudgetVsActualCard = memo(function BudgetVsActualCard({
  cardRef,
  inView,
  lookupsReady,
  budgets,
  budgetChartRows,
  budgetChartHasData,
  formatChartValue,
}: {
  cardRef: Ref<HTMLDivElement | null>;
  inView: boolean;
  lookupsReady: boolean;
  budgets: MoneyAnalyticsBudgetPayload | null;
  budgetChartRows: ReturnType<typeof budgetRowsForChart>;
  budgetChartHasData: boolean;
  formatChartValue: (minor: number) => string;
}) {
  return (
    <Card
      className={`col-span-2 w-full min-w-0 p-4 md:col-span-3 lg:col-span-6 ${CHART_CARD_LAYOUT}`}
      ref={cardRef}
      style={{
        height: Math.max(CHART_CARD_MIN_HEIGHT_HALF_PX, budgetChartRows.length * 36),
      }}
    >
      <h2 className="mb-2 font-display text-lg font-medium">Budget vs actual</h2>
      <p className="mb-2 text-xs text-muted">
        Spent amount against budget limit for the selected range.
      </p>
      <AnalyticsChartContainer>
        {!inView ? (
          <ChartViewportFallback ariaLabel="Budget chart loads when this section is visible" />
        ) : !budgets || !lookupsReady ? (
          <DeferredChartLoading ariaLabel="Loading budget chart" />
        ) : budgetChartHasData ? (
          <HorizontalBarChart
            data={budgetChartRows}
            formatValue={formatChartValue}
            variant="budget"
          />
        ) : (
          <AnalyticsEmptyState
            title="No budgets in this workspace"
            description="Create budgets in Money settings."
            minHeightClass="min-h-0"
            className={CHART_SLOT_CLASS}
            action={{ href: "/money/settings", label: "Money settings" }}
          />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});

export const MoneyFlowSankeyCard = memo(function MoneyFlowSankeyCard({
  cardRef,
  inView,
  sankeyPayload,
  sankeyHasData,
  defaultCurrency,
}: {
  cardRef: Ref<HTMLDivElement | null>;
  inView: boolean;
  sankeyPayload: MoneyAnalyticsSankeyPayload | null;
  sankeyHasData: boolean;
  defaultCurrency: string;
}) {
  return (
    <Card
      className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_TALL}`}
      ref={cardRef}
    >
      <h2 className="mb-1 font-display text-lg font-medium">Money flow</h2>
      <p className="mb-2 text-xs text-muted">
        Net income categories flow toward Cash Flow; net expense categories flow out from Cash
        Flow. When parent and subcategory directions match, the flow chains through parent and
        child levels.
      </p>
      <AnalyticsChartContainer className="text-foreground">
        {!inView ? (
          <ChartViewportFallback ariaLabel="Money flow chart loads when this section is visible" />
        ) : !sankeyPayload ? (
          <DeferredChartLoading ariaLabel="Loading money flow chart" />
        ) : sankeyHasData ? (
          <SankeyChart
            nodes={sankeyPayload.sankey.nodes}
            links={sankeyPayload.sankey.links}
            currency={defaultCurrency}
            animate={inView}
          />
        ) : (
          <AnalyticsEmptyState
            icon="flow"
            title="No money flow for this range"
            description="Add categorized expenses or income, or widen the date range."
            minHeightClass="min-h-0"
            className={CHART_SLOT_CLASS}
            {...CHART_EMPTY_TRANSACTION_ACTIONS}
          />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});

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
              title="No tagged spend in this range"
              description="Tag expenses or adjust filters for this range."
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
              description="Add expenses with merchants or widen the range."
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

export type ChartCardLookups = {
  categories: MoneyCategoryRow[];
  accounts: AnalyticsLookupAccount[];
  tags: AnalyticsLookupTag[];
};
