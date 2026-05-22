"use client";

import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import type { ReactNode, Ref } from "react";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { AnalyticsEmptyState } from "@/components/analytics-empty-state";
import type { AnalyticsBudgetRow } from "@/components/analytics-budgets-section";
import { AnalyticsStats } from "@/components/analytics-stats";
import { AnalyticsTransactionsTable } from "@/components/analytics-transactions-table";
import { ChartLegendList } from "@/components/charts/chart-legend-list";
import { colorByIndex } from "@/components/charts/chart-colors";
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import { toggleSetKey } from "@/lib/chart-legend-toggle";
import { useTheme } from "@/components/theme-provider";
import { Alert } from "@/components/ui/alert";
import {
  defaultAnalyticsFilters,
  type AnalyticsFiltersValue,
  type AnalyticsLookupAccount,
  type AnalyticsLookupMerchant,
  type AnalyticsLookupTag,
  type AnalyticsWorkspaceRow,
} from "@/components/analytics-filters";
import { budgetRowsForChart } from "@/lib/analytics-budget-label";
import { buildQuery } from "@/lib/analytics-build-query";
import { formatMinor } from "@/lib/format-money";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import { MONEY_SET_ACTIVE_WORKSPACE_MUTATION } from "@/lib/money-gql-documents";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";
import {
  moneyAnalyticsPageQueryOptions,
  moneyBootstrapQueryOptions,
} from "@/lib/money-query-options";
import { useFormatDate } from "@/lib/format-date";
import type { MoneyAnalyticsPayload } from "@/lib/money-services/analytics";
import { useInViewOnce } from "@/lib/use-in-view-once";

/** Total card height (heading + description + chart fit inside). */
const CHART_CARD_HEIGHT_FULL = "h-[260px] min-h-[260px] max-h-[260px]";
const CHART_CARD_HEIGHT_HALF = "h-[280px] min-h-[280px] max-h-[280px]";
/** Taller variant for flow/sankey-style cards. */
const CHART_CARD_HEIGHT_TALL = "h-[360px] min-h-[360px] max-h-[360px]";
const CHART_CARD_MIN_HEIGHT_HALF_PX = 280;
/** Applied to the Card around any chart so its rows lay out vertically. */
const CHART_CARD_LAYOUT = "flex flex-col";
/** Fills the chart plot slot inside AnalyticsChartContainer. */
const CHART_SLOT_CLASS = "h-full min-h-0 overflow-y-auto";

function AnalyticsChartContainer({
  className,
  legend,
  children,
}: {
  className?: string;
  legend?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "analytics-chart-container grid min-h-0 w-full flex-1 overflow-hidden",
        legend
          ? "[grid-template-columns:minmax(0,20%)_minmax(0,80%)]"
          : "grid-cols-[minmax(0,1fr)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {legend ? (
        <div className="analytics-chart-legend-slot min-h-0 min-w-0 overflow-y-auto overscroll-contain border-r border-border/60 pr-2">
          {legend}
        </div>
      ) : null}
      <div className="relative min-h-0 min-w-0 place-self-center overflow-hidden h-full w-full">
        <div className="absolute inset-0 min-h-0 min-w-0">{children}</div>
      </div>
    </div>
  );
}

const AnalyticsFilters = dynamic(
  () =>
    import("@/components/analytics-filters").then((m) => ({
      default: m.AnalyticsFilters,
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

const LineChart = dynamic(
  () =>
    import("@/components/charts/line-chart").then((m) => ({
      default: m.LineChart,
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

const DivergingBarChart = dynamic(
  () =>
    import("@/components/charts/diverging-bar-chart").then((m) => ({
      default: m.DivergingBarChart,
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

function ChartViewportFallback({ ariaLabel }: { ariaLabel: string }) {
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

function AnalyticsDashboardSkeleton() {
  return (
    <div
      className="grid w-full grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3"
      role="status"
      aria-busy="true"
      aria-label="Loading analytics"
    >
      <Skeleton className="col-span-2 h-24 md:col-span-6 lg:col-span-12" />
      <div className={`col-span-2 md:col-span-6 lg:col-span-12 ${CHART_CARD_HEIGHT_FULL}`}>
        <Skeleton className="h-full w-full" />
      </div>
      <div className={`col-span-2 md:col-span-6 lg:col-span-6 ${CHART_CARD_HEIGHT_HALF}`}>
        <Skeleton className="h-full w-full" />
      </div>
      <div className={`col-span-2 md:col-span-6 lg:col-span-6 ${CHART_CARD_HEIGHT_HALF}`}>
        <Skeleton className="h-full w-full" />
      </div>
      <div className={`col-span-2 md:col-span-6 lg:col-span-12 ${CHART_CARD_HEIGHT_FULL}`}>
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}

function AnalyticsChartsSkeleton() {
  return (
    <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3">
      <Skeleton className="col-span-2 h-24 md:col-span-6 lg:col-span-12" />
      <div className={`col-span-2 md:col-span-6 lg:col-span-12 ${CHART_CARD_HEIGHT_FULL}`}>
        <Skeleton className="h-full w-full" />
      </div>
      <div className={`col-span-2 md:col-span-6 lg:col-span-6 ${CHART_CARD_HEIGHT_HALF}`}>
        <Skeleton className="h-full w-full" />
      </div>
      <div className={`col-span-2 md:col-span-6 lg:col-span-6 ${CHART_CARD_HEIGHT_HALF}`}>
        <Skeleton className="h-full w-full" />
      </div>
      <div className={`col-span-2 md:col-span-6 lg:col-span-12 ${CHART_CARD_HEIGHT_FULL}`}>
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}

type AnalyticsChartsShellProps = {
  applied: AnalyticsFiltersValue;
  workspaceKey: string;
  defaultCurrency: string;
  spendByCategoryRef: Ref<HTMLDivElement | null>;
  monthlyColumnsRef: Ref<HTMLDivElement | null>;
  netFlowRef: Ref<HTMLDivElement | null>;
  merchantsRef: Ref<HTMLDivElement | null>;
  tagsRef: Ref<HTMLDivElement | null>;
  categoryTrendRef: Ref<HTMLDivElement | null>;
  spendByCategoryInView: boolean;
  monthlyColumnsInView: boolean;
  netFlowInView: boolean;
  merchantsInView: boolean;
  tagsInView: boolean;
  categoryTrendInView: boolean;
  resolved: ReturnType<typeof useTheme>["resolved"];
  style: ReturnType<typeof useTheme>["style"];
  categories: MoneyCategoryRow[];
  accounts: AnalyticsLookupAccount[];
  tags: AnalyticsLookupTag[];
};

function AnalyticsChartsShell(props: AnalyticsChartsShellProps) {
  const { categories, accounts, tags, ...rest } = props;
  const filterKey = useMemo(() => buildQuery(rest.applied), [rest.applied]);
  const { data } = useSuspenseQuery(
    moneyAnalyticsPageQueryOptions(rest.workspaceKey, rest.applied),
  );

  return (
    <AnalyticsChartsView
      key={`${rest.workspaceKey}:${filterKey}`}
      analytics={data.moneyAnalytics as MoneyAnalyticsPayload}
      budgets={data.moneyBudgets}
      categories={categories}
      accounts={accounts}
      tags={tags}
      {...rest}
    />
  );
}

type AnalyticsChartsViewProps = AnalyticsChartsShellProps & {
  analytics: MoneyAnalyticsPayload;
  budgets: AnalyticsBudgetRow[];
};

function AnalyticsChartsView({
  analytics,
  budgets,
  categories,
  accounts,
  tags,
  ...rest
}: AnalyticsChartsViewProps) {
  const pieSpendForChart = analytics.pieSpend.map((p) => ({
    label: p.label,
    valueMinor: p.valueMinor,
  }));
  const pieIncomeForChart = analytics.pieIncome.map((p) => ({
    label: p.label,
    valueMinor: p.valueMinor,
  }));

  const pieSpendHasData = analytics.pieSpend.some((p) => p.valueMinor > 0);
  const pieIncomeHasData = analytics.pieIncome.some((p) => p.valueMinor > 0);
  const columnHasFlow = analytics.column.some(
    (c) => c.expenseMinor > 0 || c.incomeMinor > 0,
  );
  const columnExpenseTotal = analytics.column.reduce((s, c) => s + c.expenseMinor, 0);
  const columnIncomeTotal = analytics.column.reduce((s, c) => s + c.incomeMinor, 0);
  const pieSpendTotal = analytics.pieSpend.reduce((s, p) => s + p.valueMinor, 0);
  const pieIncomeTotal = analytics.pieIncome.reduce((s, p) => s + p.valueMinor, 0);
  const sankeyHasData = analytics.sankey.links.length > 0;
  const lineHasData =
    analytics.line.some((p) => p.netMinor !== 0) ||
    (analytics.lineCompare?.points.some((p) => p.netMinor !== 0) ?? false);
  const merchantsHasData = analytics.merchantsSpend.some((m) => m.valueMinor > 0);
  const tagsHasData = analytics.tagsSpend.some((t) => t.valueMinor > 0);
  const categoryTrendHasData = analytics.categoryByMonthStacked.some((m) =>
    m.series.some((s) => s.valueMinor > 0),
  );
  const recurringHasData = analytics.recurringSpend.some((r) => r.valueMinor > 0);
  const divergingHasData =
    analytics.stats.incomeMinor > 0 || analytics.stats.expenseMinor > 0;
  const budgetChartRows = useMemo(
    () => budgetRowsForChart(budgets, categories, accounts, tags),
    [budgets, categories, accounts, tags],
  );
  const budgetChartHasData = budgetChartRows.some(
    (b) => b.valueMinor > 0 || (b.limitMinor ?? 0) > 0,
  );

  const { formatMonthYear } = useFormatDate();
  const lineCompareLabel = analytics.lineCompare
    ? formatMonthYear(analytics.lineCompare.fromDate)
    : null;

  const {
    spendByCategoryRef,
    monthlyColumnsRef,
    netFlowRef,
    merchantsRef,
    tagsRef,
    categoryTrendRef,
    spendByCategoryInView,
    monthlyColumnsInView,
    netFlowInView,
    merchantsInView,
    tagsInView,
    categoryTrendInView,
    resolved,
    style,
    defaultCurrency,
  } = rest;

  const isCurrentMonthCompare = Boolean(analytics.lineCompare);

  const [hiddenSpendCategories, setHiddenSpendCategories] = useState(
    () => new Set<string>(),
  );
  const [hiddenIncomeCategories, setHiddenIncomeCategories] = useState(
    () => new Set<string>(),
  );
  const [hiddenColumnSeries, setHiddenColumnSeries] = useState(
    () => new Set<"expense" | "income">(),
  );
  const [hiddenLineSeries, setHiddenLineSeries] = useState(
    () => new Set<"primary" | "compare">(),
  );
  const [hiddenCategoryTrendKeys, setHiddenCategoryTrendKeys] = useState(
    () => new Set<string>(),
  );
  const [hoveredSpendCategory, setHoveredSpendCategory] = useState<string | null>(
    null,
  );
  const [hoveredIncomeCategory, setHoveredIncomeCategory] = useState<string | null>(
    null,
  );

  const formatChartValue = useCallback(
    (minor: number) => formatMinor(minor, defaultCurrency),
    [defaultCurrency],
  );

  const spendLegendItems = useMemo(
    () =>
      analytics.pieSpend.slice(0, 8).map((p, i) => ({
        key: p.label,
        label: p.label,
        color: colorByIndex(resolved, i, style),
        valueText: formatMinor(p.valueMinor, defaultCurrency),
      })),
    [analytics.pieSpend, resolved, style, defaultCurrency],
  );

  const incomeLegendItems = useMemo(
    () =>
      analytics.pieIncome.slice(0, 8).map((p, i) => ({
        key: p.label,
        label: p.label,
        color: colorByIndex(resolved, i, style),
        valueText: formatMinor(p.valueMinor, defaultCurrency),
      })),
    [analytics.pieIncome, resolved, style, defaultCurrency],
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

  const linePrimaryColor = useMemo(() => {
    const last = analytics.line[analytics.line.length - 1]?.netMinor ?? 0;
    return last < 0
      ? chartExpenseColor(resolved, style)
      : chartIncomeColor(resolved, style);
  }, [analytics.line, resolved, style]);

  const categoryTrendLegendItems = useMemo(() => {
    const keys = new Set<string>();
    for (const m of analytics.categoryByMonthStacked) {
      for (const s of m.series) keys.add(s.key);
    }
    return [...keys].map((key, i) => {
      const label =
        analytics.categoryByMonthStacked
          .flatMap((m) => m.series)
          .find((s) => s.key === key)?.label ?? key;
      return {
        key,
        label,
        color: colorByIndex(resolved, i, style),
        valueText: "",
      };
    });
  }, [analytics.categoryByMonthStacked, resolved, style]);

  const lineLegendItems = useMemo(() => {
    const items = [
      {
        key: "primary",
        label: isCurrentMonthCompare ? "This month" : "Selected range",
        color: linePrimaryColor,
        valueText: formatMinor(
          analytics.line[analytics.line.length - 1]?.netMinor ?? 0,
          defaultCurrency,
        ),
      },
    ];
    if (analytics.lineCompare && lineCompareLabel) {
      const compareLast =
        analytics.lineCompare.points[analytics.lineCompare.points.length - 1]
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
    analytics.line,
    analytics.lineCompare,
    lineCompareLabel,
    linePrimaryColor,
    defaultCurrency,
    isCurrentMonthCompare,
  ]);

  return (
    <>
      <AnalyticsStats
        stats={analytics.stats}
        column={analytics.column}
        range={analytics.range}
        currency={defaultCurrency}
      />

      <Card
        className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_TALL}`}
        ref={netFlowRef}
      >
        <h2 className="mb-2 font-display text-lg font-medium">Net cumulative flow</h2>
        {analytics.lineCompare ? (
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
            lineHasData && netFlowInView ? (
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
          {netFlowInView ? (
            lineHasData ? (
              <LineChart
                data={analytics.line}
                comparison={
                  analytics.lineCompare && lineCompareLabel
                    ? {
                        label: lineCompareLabel,
                        data: analytics.lineCompare.points,
                      }
                    : undefined
                }
                xMode={analytics.lineMode ?? "date"}
                formatY={(minor) => formatMinor(minor, defaultCurrency)}
                hiddenSeries={hiddenLineSeries}
                animate={netFlowInView}
              />
            ) : (
              <AnalyticsEmptyState
                title="No cash flow in this range"
                description="Widen the range or add transactions."
                descriptionClassName="line-clamp-1"
                minHeightClass="min-h-0"
                className={CHART_SLOT_CLASS}
                action={{ href: "/money", label: "Add or view transactions" }}
              />
            )
          ) : (
            <ChartViewportFallback ariaLabel="Net cumulative flow chart loads when this section is visible" />
          )}
        </AnalyticsChartContainer>
      </Card>

      <Card className={`col-span-2 w-full min-w-0 p-4 md:col-span-3 lg:col-span-6 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`}>
        <h2 className="mb-2 font-display text-lg font-medium">Income vs expenses</h2>
        <p className="mb-2 text-xs text-muted">Totals for the selected filter range.</p>
        <AnalyticsChartContainer>
          {divergingHasData ? (
            <DivergingBarChart
              incomeMinor={analytics.stats.incomeMinor}
              expenseMinor={analytics.stats.expenseMinor}
              formatValue={formatChartValue}
            />
          ) : (
            <AnalyticsEmptyState
              title="No income or expenses in this range"
              description="Add transactions or widen the date range."
              minHeightClass="min-h-0"
              className={CHART_SLOT_CLASS}
              action={{ href: "/money", label: "Add or view transactions" }}
            />
          )}
        </AnalyticsChartContainer>
      </Card>

      <Card
        className={`col-span-2 w-full min-w-0 p-4 md:col-span-3 lg:col-span-6 ${CHART_CARD_LAYOUT}`}
        style={{
          height: Math.max(
            CHART_CARD_MIN_HEIGHT_HALF_PX,
            budgetChartRows.length * 36,
          ),
        }}
      >
        <h2 className="mb-2 font-display text-lg font-medium">Budget vs actual</h2>
        <p className="mb-2 text-xs text-muted">
          Spent amount against budget limit for the selected range.
        </p>
        <AnalyticsChartContainer>
          {budgetChartHasData ? (
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

      <Card className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_TALL}`}>
        <h2 className="mb-1 font-display text-lg font-medium">Money flow</h2>
        <p className="mb-2 text-xs text-muted">
          Expenses run from accounts to categories (through account budgets when set), then into
          category or whole-workspace budgets when applicable. Income runs from categories into
          accounts. Tag budgets appear on the flow when applicable.
        </p>
        <AnalyticsChartContainer className="text-foreground">
          {sankeyHasData ? (
            <SankeyChart
              nodes={analytics.sankey.nodes}
              links={analytics.sankey.links}
              currency={defaultCurrency}
            />
          ) : (
            <AnalyticsEmptyState
              icon="flow"
              title="No money flow for this range"
              description="Add categorized expenses or income, or widen the date range."
              minHeightClass="min-h-0"
              className={CHART_SLOT_CLASS}
              action={{ href: "/money", label: "Add or view transactions" }}
            />
          )}
        </AnalyticsChartContainer>
      </Card>

      <div className="col-span-2 grid min-w-0 grid-cols-3 gap-2 md:col-span-6 md:gap-3 lg:col-span-12 lg:gap-3">
        <Card className={`min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`} ref={spendByCategoryRef}>
          <h2 className="mb-2 font-display text-lg font-medium">Spend by category</h2>
          <AnalyticsChartContainer
            legend={
              spendByCategoryInView && pieSpendHasData ? (
                <ChartLegendList
                  items={spendLegendItems}
                  hiddenKeys={hiddenSpendCategories}
                  onToggle={(key) =>
                    setHiddenSpendCategories((s) => toggleSetKey(s, key))
                  }
                  hoveredKey={hoveredSpendCategory}
                  onHover={setHoveredSpendCategory}
                  showValues={false}
                />
              ) : undefined
            }
          >
            {spendByCategoryInView ? (
              pieSpendHasData ? (
                <PieByCategoryChart
                  data={pieSpendForChart}
                  hiddenLabels={hiddenSpendCategories}
                  hoveredLabel={hoveredSpendCategory}
                  animate={spendByCategoryInView}
                  formatValue={formatChartValue}
                  centerTotalMinor={pieSpendTotal}
                  centerLabel="Spent"
                />
              ) : (
                <AnalyticsEmptyState
                  title="No category spend in this range"
                  description="Add expenses or adjust filters for this range."
                  minHeightClass="min-h-0"
                  className={CHART_SLOT_CLASS}
                  action={{ href: "/money", label: "Add or view transactions" }}
                />
              )
            ) : (
              <ChartViewportFallback ariaLabel="Spend by category chart loads when this section is visible" />
            )}
          </AnalyticsChartContainer>
        </Card>

        <Card className={`min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`}>
          <h2 className="mb-2 font-display text-lg font-medium">Income by category</h2>
          <AnalyticsChartContainer
            legend={
              pieIncomeHasData ? (
                <ChartLegendList
                  items={incomeLegendItems}
                  hiddenKeys={hiddenIncomeCategories}
                  onToggle={(key) =>
                    setHiddenIncomeCategories((s) => toggleSetKey(s, key))
                  }
                  hoveredKey={hoveredIncomeCategory}
                  onHover={setHoveredIncomeCategory}
                  showValues={false}
                />
              ) : undefined
            }
          >
            {pieIncomeHasData ? (
              <PieByCategoryChart
                data={pieIncomeForChart}
                hiddenLabels={hiddenIncomeCategories}
                hoveredLabel={hoveredIncomeCategory}
                animate
                formatValue={formatChartValue}
                centerTotalMinor={pieIncomeTotal}
                centerLabel="Earned"
              />
            ) : (
              <AnalyticsEmptyState
                title="No category income in this range"
                description="Add income or adjust filters for this range."
                minHeightClass="min-h-0"
                className={CHART_SLOT_CLASS}
                action={{ href: "/money", label: "Add or view transactions" }}
              />
            )}
          </AnalyticsChartContainer>
        </Card>

        <Card className={`min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`} ref={monthlyColumnsRef}>
          <h2 className="mb-2 font-display text-lg font-medium">
            Monthly expense and income
          </h2>
          <AnalyticsChartContainer
            legend={
              monthlyColumnsInView && columnHasFlow ? (
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
            {monthlyColumnsInView ? (
              columnHasFlow ? (
                <ColumnChart
                  data={analytics.column}
                  hiddenSeries={hiddenColumnSeries}
                  animate={monthlyColumnsInView}
                  formatValue={formatChartValue}
                  showNetLine
                />
              ) : (
                <AnalyticsEmptyState
                  title="No monthly expense or income to plot"
                  description="Add transactions or widen the range to see bars."
                  minHeightClass="min-h-0"
                  className={CHART_SLOT_CLASS}
                  action={{ href: "/money", label: "Add or view transactions" }}
                />
              )
            ) : (
              <ChartViewportFallback ariaLabel="Monthly expense and income chart loads when this section is visible" />
            )}
          </AnalyticsChartContainer>
        </Card>

        <Card className={`min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`} ref={categoryTrendRef}>
          <h2 className="mb-2 font-display text-lg font-medium">
            Category spend trend
          </h2>
          <AnalyticsChartContainer
            legend={
              categoryTrendInView &&
              categoryTrendHasData &&
              categoryTrendLegendItems.length > 0 ? (
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
            {categoryTrendInView ? (
              categoryTrendHasData ? (
                <StackedAreaChart
                  data={analytics.categoryByMonthStacked}
                  hiddenKeys={hiddenCategoryTrendKeys}
                  formatValue={formatChartValue}
                  animate={categoryTrendInView}
                />
              ) : (
                <AnalyticsEmptyState
                  title="No category trend in this range"
                  description="Add categorized expenses across months."
                  minHeightClass="min-h-0"
                  className={CHART_SLOT_CLASS}
                  action={{ href: "/money", label: "Add or view transactions" }}
                />
              )
            ) : (
              <ChartViewportFallback ariaLabel="Category spend trend chart loads when this section is visible" />
            )}
          </AnalyticsChartContainer>
        </Card>

        <Card className={`min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`} ref={tagsRef}>
          <h2 className="mb-2 font-display text-lg font-medium">Spend by tag</h2>
          <AnalyticsChartContainer>
            {tagsInView ? (
              tagsHasData ? (
                <HorizontalBarChart
                  data={analytics.tagsSpend.map((t, i) => ({
                    key: `t-${i}-${t.label}`,
                    label: t.label,
                    valueMinor: t.valueMinor,
                  }))}
                  formatValue={formatChartValue}
                  animate={tagsInView}
                />
              ) : (
                <AnalyticsEmptyState
                  title="No tagged spend in this range"
                  description="Tag expenses or adjust filters for this range."
                  minHeightClass="min-h-0"
                  className={CHART_SLOT_CLASS}
                  action={{ href: "/money", label: "Add or view transactions" }}
                />
              )
            ) : (
              <ChartViewportFallback ariaLabel="Spend by tag chart loads when this section is visible" />
            )}
          </AnalyticsChartContainer>
        </Card>

        <Card className={`min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`} ref={merchantsRef}>
          <h2 className="mb-2 font-display text-lg font-medium">Top merchants</h2>
          <AnalyticsChartContainer>
            {merchantsInView ? (
              merchantsHasData ? (
                <HorizontalBarChart
                  data={analytics.merchantsSpend.map((m, i) => ({
                    key: `m-${i}-${m.label}`,
                    label: m.label,
                    valueMinor: m.valueMinor,
                  }))}
                  formatValue={formatChartValue}
                  animate={merchantsInView}
                />
              ) : (
                <AnalyticsEmptyState
                  title="No merchant spend in this range"
                  description="Add expenses with merchants or widen the range."
                  minHeightClass="min-h-0"
                  className={CHART_SLOT_CLASS}
                  action={{ href: "/money", label: "Add or view transactions" }}
                />
              )
            ) : (
              <ChartViewportFallback ariaLabel="Top merchants chart loads when this section is visible" />
            )}
          </AnalyticsChartContainer>
        </Card>
      </div>


      <Card className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_FULL}`}>
        <h2 className="mb-2 font-display text-lg font-medium">Recurring spend</h2>
        <p className="mb-2 text-xs text-muted">
          Expenses posted from recurrence templates in this range.
        </p>
        <AnalyticsChartContainer>
          {recurringHasData ? (
            <HorizontalBarChart
              data={analytics.recurringSpend.map((r, i) => ({
                key: r.templateId ?? `r-${i}`,
                label: r.label,
                valueMinor: r.valueMinor,
              }))}
              formatValue={formatChartValue}
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
    </>
  );
}

function AnalyticsDashboardLoaded() {
  const { data: session } = useSession();
  const userSub = session?.user?.id;
  const { defaultCurrency, refreshWorkspaceCurrency } = useWorkspaceCurrency();
  const { resolved, style } = useTheme();
  const queryClient = useQueryClient();

  const {
    ref: spendByCategoryRef,
    isInView: spendByCategoryInView,
  } = useInViewOnce();
  const {
    ref: monthlyColumnsRef,
    isInView: monthlyColumnsInView,
  } = useInViewOnce();
  const { ref: netFlowRef, isInView: netFlowInView } = useInViewOnce();
  const { ref: merchantsRef, isInView: merchantsInView } = useInViewOnce();
  const { ref: tagsRef, isInView: tagsInView } = useInViewOnce();
  const { ref: categoryTrendRef, isInView: categoryTrendInView } = useInViewOnce();

  const { data: boot } = useSuspenseQuery(moneyBootstrapQueryOptions());

  const workspaces = boot.workspaces as AnalyticsWorkspaceRow[];
  const accounts = boot.accounts as AnalyticsLookupAccount[];
  const categories = boot.categories as MoneyCategoryRow[];
  const merchants = boot.merchants as AnalyticsLookupMerchant[];
  const tags = boot.tags as AnalyticsLookupTag[];

  const [activeWorkspaceId, setActiveWorkspaceId] = useState(boot.workspaceId);
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<AnalyticsFiltersValue>(() =>
    defaultAnalyticsFilters(),
  );
  const [applied, setApplied] = useState<AnalyticsFiltersValue>(() =>
    defaultAnalyticsFilters(),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isFilterPending, startFilterTransition] = useTransition();

  const fetchSeq = useRef(0);

  const draftKey = useMemo(() => JSON.stringify(draft), [draft]);
  const appliedKey = useMemo(() => JSON.stringify(applied), [applied]);
  const dirty = draftKey !== appliedKey;

  const analyticsFilterQuery = useMemo(() => buildQuery(applied), [applied]);

  useEffect(() => {
    let cancelled = false;
    const seq = ++fetchSeq.current;
    void (async () => {
      try {
        let resolvedId = boot.workspaceId;
        if (!boot.workspaces.some((w) => w.id === resolvedId)) {
          resolvedId =
            boot.workspaces.find((w) => w.isDefault)?.id ??
            boot.workspaces[0]?.id ??
            resolvedId;
        }
        if (cancelled || seq !== fetchSeq.current) return;
        setActiveWorkspaceId(resolvedId);
        if (
          resolvedId &&
          resolvedId !== boot.workspaceId &&
          boot.workspaces.some((w) => w.id === resolvedId)
        ) {
          await moneyGraphQLRequest(MONEY_SET_ACTIVE_WORKSPACE_MUTATION, {
            workspaceId: resolvedId,
          });
          await refreshWorkspaceCurrency();
          await queryClient.invalidateQueries({ queryKey: ["money", "bootstrap"] });
        }
      } catch (e: unknown) {
        if (!cancelled && seq === fetchSeq.current) {
          setError(e instanceof Error ? e.message : "Error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boot.workspaces, boot.workspaceId, queryClient, refreshWorkspaceCurrency]);

  const handleWorkspaceChange = useCallback(
    async (next: string) => {
      if (!next || next === activeWorkspaceId) return;
      setSwitchingWorkspace(true);
      setError(null);
      try {
        await moneyGraphQLRequest(MONEY_SET_ACTIVE_WORKSPACE_MUTATION, {
          workspaceId: next,
        });
        setActiveWorkspaceId(next);
        await refreshWorkspaceCurrency();
        await queryClient.invalidateQueries({ queryKey: ["money", "bootstrap"] });
        await queryClient.invalidateQueries({ queryKey: ["money", "analyticsPage"] });
        const fresh = defaultAnalyticsFilters();
        setDraft(fresh);
        setApplied(fresh);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setSwitchingWorkspace(false);
      }
    },
    [activeWorkspaceId, queryClient, refreshWorkspaceCurrency],
  );

  const handleApply = useCallback(() => {
    startFilterTransition(() => {
      setApplied(draft);
      setFiltersOpen(false);
    });
  }, [draft]);

  const handleReset = useCallback(() => {
    const fresh = defaultAnalyticsFilters();
    setDraft(fresh);
    setApplied(fresh);
  }, []);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 md:mb-4 fx-fade-in">
        <p className="max-w-prose text-sm text-muted">
          Workspace-scoped aggregates for the range you set in Filter (default: start through end of
          the current calendar month). Apply to refresh charts.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => setFiltersOpen(true)}
          trailing={
            dirty ? (
              <span
                className="size-1.5 rounded-full bg-accent/70"
                aria-hidden
              />
            ) : null
          }
        >
          Filter
          {dirty ? <span className="sr-only">Unapplied filter changes</span> : null}
        </Button>
      </div>

      {filtersOpen ? (
        <Modal
          open
          onClose={() => setFiltersOpen(false)}
          bare
          labelledBy="analytics-filters-heading"
        >
          <AnalyticsFilters
            value={draft}
            onChange={setDraft}
            onApply={handleApply}
            onReset={handleReset}
            applying={isFilterPending}
            dirty={dirty}
            accounts={accounts}
            categories={categories}
            merchants={merchants}
            tags={tags}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onWorkspaceChange={handleWorkspaceChange}
            switchingWorkspace={switchingWorkspace}
            userSub={userSub}
            onClose={() => setFiltersOpen(false)}
          />
        </Modal>
      ) : null}

      <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3">
        {error ? (
          <div className="col-span-2 md:col-span-6 lg:col-span-12">
            <Alert variant="error" title="Couldn’t load analytics" description={error} />
          </div>
        ) : null}

        <Suspense fallback={<AnalyticsChartsSkeleton />}>
          <AnalyticsChartsShell
            applied={applied}
            workspaceKey={activeWorkspaceId}
            defaultCurrency={defaultCurrency}
            spendByCategoryRef={spendByCategoryRef}
            monthlyColumnsRef={monthlyColumnsRef}
            netFlowRef={netFlowRef}
            merchantsRef={merchantsRef}
            tagsRef={tagsRef}
            categoryTrendRef={categoryTrendRef}
            spendByCategoryInView={spendByCategoryInView}
            monthlyColumnsInView={monthlyColumnsInView}
            netFlowInView={netFlowInView}
            merchantsInView={merchantsInView}
            tagsInView={tagsInView}
            categoryTrendInView={categoryTrendInView}
            resolved={resolved}
            style={style}
            categories={categories}
            accounts={accounts}
            tags={tags}
          />
        </Suspense>

        {activeWorkspaceId ? (
          <AnalyticsTransactionsTable
            filterQuery={analyticsFilterQuery}
            activeWorkspaceId={activeWorkspaceId}
            accounts={accounts}
            categories={categories}
            currency={defaultCurrency}
          />
        ) : null}
      </div>
    </>
  );
}

export function AnalyticsDashboard() {
  return (
    <Suspense fallback={<AnalyticsDashboardSkeleton />}>
      <AnalyticsDashboardLoaded />
    </Suspense>
  );
}
