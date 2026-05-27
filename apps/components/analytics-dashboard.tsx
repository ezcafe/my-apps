"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
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
import {
  MoneyAnalyticsChartsSkeleton,
  MoneyAnalyticsPageSkeleton,
  MoneyAnalyticsTransactionsTableSkeleton,
} from "@/components/money-analytics-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { AnalyticsEmptyState } from "@/components/analytics-empty-state";
import { AnalyticsStats } from "@/components/analytics-stats";
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
  moneyAnalyticsBudgetsQueryOptions,
  moneyAnalyticsChartLookupsQueryOptions,
  moneyAnalyticsDistributionQueryOptions,
  moneyAnalyticsLeadersQueryOptions,
  moneyAnalyticsMerchantLookupsQueryOptions,
  moneyAnalyticsOverviewQueryOptions,
  moneyAnalyticsSummaryQueryOptions,
  moneyAnalyticsSankeyQueryOptions,
  moneyWorkspaceStateQueryOptions,
} from "@/lib/money-query-options";
import { useFormatDate } from "@/lib/format-date";
import type {
  MoneyAnalyticsBudgetPayload,
  MoneyAnalyticsDistributionPayload,
  MoneyAnalyticsLeadersPayload,
  MoneyAnalyticsOverviewPayload,
  MoneyAnalyticsSummaryPayload,
  MoneyAnalyticsSankeyPayload,
} from "@/lib/money-services/analytics";
import { useInViewOnce } from "@/lib/use-in-view-once";

/** Total card height (heading + description + chart fit inside). */
const CHART_CARD_HEIGHT_FULL = "h-[260px] min-h-[260px] max-h-[260px]";
const CHART_CARD_HEIGHT_HALF = "h-[280px] min-h-[280px] max-h-[280px]";
/** Taller variant for flow/sankey-style cards. */
const CHART_CARD_HEIGHT_TALL = "h-[360px] min-h-[360px] max-h-[360px]";
const CHART_CARD_MIN_HEIGHT_HALF_PX = 280;
/** Applied to the Card around any chart so its rows lay out vertically. */
const CHART_CARD_LAYOUT = "flex flex-col";
/** Fills the chart plot slot inside AnalyticsChartContainer for non-scrollable empty states. */
const CHART_SLOT_CLASS = "h-full min-h-0 overflow-hidden";

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

const AnalyticsTransactionsTableLazy = dynamic(
  () =>
    import("@/components/analytics-transactions-table").then((m) => ({
      default: m.AnalyticsTransactionsTable,
    })),
  { loading: () => <MoneyAnalyticsTransactionsTableSkeleton /> },
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

function DeferredChartLoading({ ariaLabel }: { ariaLabel: string }) {
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

export function AnalyticsDashboardSkeleton() {
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

export function AnalyticsChartsSkeleton() {
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

type AnalyticsStagesProps = {
  applied: AnalyticsFiltersValue;
  filterQuery: string;
  workspaceKey: string;
  defaultCurrency: string;
  budgetRef: Ref<HTMLDivElement | null>;
  sankeyRef: Ref<HTMLDivElement | null>;
  spendByCategoryRef: Ref<HTMLDivElement | null>;
  monthlyColumnsRef: Ref<HTMLDivElement | null>;
  netFlowRef: Ref<HTMLDivElement | null>;
  merchantsRef: Ref<HTMLDivElement | null>;
  recurringRef: Ref<HTMLDivElement | null>;
  tagsRef: Ref<HTMLDivElement | null>;
  categoryTrendRef: Ref<HTMLDivElement | null>;
  transactionsRef: Ref<HTMLDivElement | null>;
  budgetInView: boolean;
  sankeyInView: boolean;
  spendByCategoryInView: boolean;
  monthlyColumnsInView: boolean;
  netFlowInView: boolean;
  merchantsInView: boolean;
  recurringInView: boolean;
  tagsInView: boolean;
  categoryTrendInView: boolean;
  transactionsInView: boolean;
  resolved: ReturnType<typeof useTheme>["resolved"];
  style: ReturnType<typeof useTheme>["style"];
  lookupsReady: boolean;
  categories: MoneyCategoryRow[];
  accounts: AnalyticsLookupAccount[];
  tags: AnalyticsLookupTag[];
};

function AnalyticsSummaryShell(props: AnalyticsStagesProps) {
  const filterKey = useMemo(() => props.filterQuery, [props.filterQuery]);
  const { data } = useSuspenseQuery(
    moneyAnalyticsSummaryQueryOptions(props.workspaceKey, props.applied),
  );

  return (
    <AnalyticsChartsView
      key={`${props.workspaceKey}:${filterKey}`}
      summary={data.moneyAnalyticsSummary as MoneyAnalyticsSummaryPayload}
      {...props}
    />
  );
}

type AnalyticsChartsViewProps = AnalyticsStagesProps & {
  summary: MoneyAnalyticsSummaryPayload;
};

function AnalyticsChartsView({
  summary,
  ...rest
}: AnalyticsChartsViewProps) {
  const {
    applied,
    filterQuery,
    workspaceKey,
    budgetRef,
    sankeyRef,
    spendByCategoryRef,
    monthlyColumnsRef,
    netFlowRef,
    merchantsRef,
    recurringRef,
    tagsRef,
    categoryTrendRef,
    transactionsRef,
    budgetInView,
    sankeyInView,
    spendByCategoryInView,
    monthlyColumnsInView,
    netFlowInView,
    merchantsInView,
    recurringInView,
    tagsInView,
    categoryTrendInView,
    transactionsInView,
    resolved,
    style,
    lookupsReady,
    categories,
    accounts,
    tags,
    defaultCurrency,
  } = rest;

  const { data: overviewResponse } = useQuery({
    ...moneyAnalyticsOverviewQueryOptions(workspaceKey, applied),
    enabled: Boolean(workspaceKey),
  });
  const overview =
    (overviewResponse?.moneyAnalyticsOverview as
      | MoneyAnalyticsOverviewPayload
      | undefined) ?? null;
  const overviewReady = overview !== null;
  const distributionStageInView = spendByCategoryInView || categoryTrendInView;
  const leadersStageInView = merchantsInView || recurringInView || tagsInView;
  const budgetStageReady = !budgetInView;
  const sankeyStageReady = !sankeyInView;
  const distributionStageReady = !distributionStageInView;
  const leadersStageReady = !leadersStageInView;

  const { data: budgetsResponse } = useQuery({
    ...moneyAnalyticsBudgetsQueryOptions(workspaceKey, applied),
    enabled:
      budgetInView &&
      lookupsReady &&
      overviewReady &&
      Boolean(workspaceKey),
  });
  const budgets =
    (budgetsResponse?.moneyAnalyticsBudgets as
      | MoneyAnalyticsBudgetPayload
      | undefined) ?? null;
  const budgetSectionReady = budgetStageReady || budgets != null;

  const { data: sankeyResponse } = useQuery({
    ...moneyAnalyticsSankeyQueryOptions(workspaceKey, applied),
    enabled:
      sankeyInView &&
      overviewReady &&
      budgetSectionReady &&
      Boolean(workspaceKey),
  });
  const sankeyPayload =
    (sankeyResponse?.moneyAnalyticsSankey as
      | MoneyAnalyticsSankeyPayload
      | undefined) ?? null;
  const sankeySectionReady = sankeyStageReady || sankeyPayload != null;

  const { data: distributionResponse } = useQuery({
    ...moneyAnalyticsDistributionQueryOptions(workspaceKey, applied),
    enabled:
      distributionStageInView &&
      overviewReady &&
      sankeySectionReady &&
      Boolean(workspaceKey),
  });
  const distribution =
    (distributionResponse?.moneyAnalyticsDistribution as
      | MoneyAnalyticsDistributionPayload
      | undefined) ?? null;
  const distributionSectionReady = distributionStageReady || distribution != null;

  const { data: leadersResponse } = useQuery({
    ...moneyAnalyticsLeadersQueryOptions(workspaceKey, applied),
    enabled:
      leadersStageInView &&
      overviewReady &&
      distributionSectionReady &&
      Boolean(workspaceKey),
  });
  const leaders =
    (leadersResponse?.moneyAnalyticsLeaders as
      | MoneyAnalyticsLeadersPayload
      | undefined) ?? null;
  const leadersSectionReady = leadersStageReady || leaders != null;
  const incomeByCategoryInView = spendByCategoryInView;
  const summaryStats = summary.stats;
  const summaryRange = summary.range;
  const overviewColumn = overview?.column ?? [];
  const overviewLine = overview?.line ?? [];
  const overviewLineCompare = overview?.lineCompare;
  const overviewLineMode = overview?.lineMode ?? "date";

  const pieSpendForChart = distribution?.pieSpend.map((p) => ({
    label: p.label,
    valueMinor: p.valueMinor,
  })) ?? [];
  const pieIncomeForChart = distribution?.pieIncome.map((p) => ({
    label: p.label,
    valueMinor: p.valueMinor,
  })) ?? [];

  const pieSpendHasData =
    distribution?.pieSpend.some((p) => p.valueMinor > 0) ?? false;
  const pieIncomeHasData =
    distribution?.pieIncome.some((p) => p.valueMinor > 0) ?? false;
  const columnHasFlow = overviewColumn.some(
    (c) => c.expenseMinor > 0 || c.incomeMinor > 0,
  );
  const columnExpenseTotal = overviewColumn.reduce((s, c) => s + c.expenseMinor, 0);
  const columnIncomeTotal = overviewColumn.reduce((s, c) => s + c.incomeMinor, 0);
  const pieSpendTotal =
    distribution?.pieSpend.reduce((s, p) => s + p.valueMinor, 0) ?? 0;
  const pieIncomeTotal =
    distribution?.pieIncome.reduce((s, p) => s + p.valueMinor, 0) ?? 0;
  const sankeyHasData =
    sankeyPayload?.sankey.links.length
      ? sankeyPayload.sankey.links.length > 0
      : false;
  const lineHasData =
    overviewLine.some((p) => p.netMinor !== 0) ||
    (overviewLineCompare?.points.some((p) => p.netMinor !== 0) ?? false);
  const merchantsHasData =
    leaders?.merchantsSpend.some((m) => m.valueMinor > 0) ?? false;
  const tagsHasData = leaders?.tagsSpend.some((t) => t.valueMinor > 0) ?? false;
  const categoryTrendHasData =
    distribution?.categoryByMonthStacked.some((m) =>
      m.series.some((s) => s.valueMinor > 0),
    ) ?? false;
  const recurringHasData =
    leaders?.recurringSpend.some((r) => r.valueMinor > 0) ?? false;
  const divergingHasData =
    summaryStats.incomeMinor > 0 || summaryStats.expenseMinor > 0;
  const budgetChartRows = useMemo(
    () =>
      budgets
        ? budgetRowsForChart(budgets.budgets, categories, accounts, tags)
        : [],
    [budgets, categories, accounts, tags],
  );
  const budgetChartHasData = budgetChartRows.some(
    (b) => b.valueMinor > 0 || (b.limitMinor ?? 0) > 0,
  );

  const { formatMonthYear } = useFormatDate();
  const lineCompareLabel = overviewLineCompare
    ? formatMonthYear(overviewLineCompare.fromDate)
    : null;

  const isCurrentMonthCompare = Boolean(overviewLineCompare);

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
      (distribution?.pieSpend ?? []).slice(0, 8).map((p, i) => ({
        key: p.label,
        label: p.label,
        color: colorByIndex(resolved, i, style),
        valueText: formatMinor(p.valueMinor, defaultCurrency),
      })),
    [distribution?.pieSpend, resolved, style, defaultCurrency],
  );

  const incomeLegendItems = useMemo(
    () =>
      (distribution?.pieIncome ?? []).slice(0, 8).map((p, i) => ({
        key: p.label,
        label: p.label,
        color: colorByIndex(resolved, i, style),
        valueText: formatMinor(p.valueMinor, defaultCurrency),
      })),
    [distribution?.pieIncome, resolved, style, defaultCurrency],
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
    const line = overview?.line ?? [];
    const last = line[line.length - 1]?.netMinor ?? 0;
    return last < 0
      ? chartExpenseColor(resolved, style)
      : chartIncomeColor(resolved, style);
  }, [overview, resolved, style]);

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

  const lineLegendItems = useMemo(() => {
    const line = overview?.line ?? [];
    const lineCompare = overview?.lineCompare;
    const items = [
      {
        key: "primary",
        label: isCurrentMonthCompare ? "This month" : "Selected range",
        color: linePrimaryColor,
        valueText: formatMinor(
          line[line.length - 1]?.netMinor ?? 0,
          defaultCurrency,
        ),
      },
    ];
    if (lineCompare && lineCompareLabel) {
      const compareLast =
        lineCompare.points[lineCompare.points.length - 1]?.netMinor ?? 0;
      items.push({
        key: "compare",
        label: lineCompareLabel,
        color: "var(--muted)",
        valueText: formatMinor(compareLast, defaultCurrency),
      });
    }
    return items;
  }, [
    overview,
    lineCompareLabel,
    linePrimaryColor,
    defaultCurrency,
    isCurrentMonthCompare,
  ]);

  return (
    <>
      <AnalyticsStats
        stats={summaryStats}
        column={overviewColumn}
        range={summaryRange}
        currency={defaultCurrency}
      />

      <Card
        className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_TALL}`}
        ref={netFlowRef}
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
              action={{ href: "/money", label: "Add or view transactions" }}
            />
          )}
        </AnalyticsChartContainer>
      </Card>

      <Card
        className={`col-span-2 w-full min-w-0 p-4 md:col-span-3 lg:col-span-6 ${CHART_CARD_LAYOUT}`}
        ref={budgetRef}
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
          {!budgetInView ? (
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

      <Card
        className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_TALL}`}
        ref={sankeyRef}
      >
        <h2 className="mb-1 font-display text-lg font-medium">Money flow</h2>
        <p className="mb-2 text-xs text-muted">
          Expenses run from accounts to categories (through account budgets when set), then into
          category or whole-workspace budgets when applicable. Income runs from categories into
          accounts. Tag budgets appear on the flow when applicable.
        </p>
        <AnalyticsChartContainer className="text-foreground">
          {!sankeyInView ? (
            <ChartViewportFallback ariaLabel="Money flow chart loads when this section is visible" />
          ) : !sankeyPayload ? (
            <DeferredChartLoading ariaLabel="Loading money flow chart" />
          ) : sankeyHasData ? (
            <SankeyChart
              nodes={sankeyPayload.sankey.nodes}
              links={sankeyPayload.sankey.links}
              currency={defaultCurrency}
              animate={sankeyInView}
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
              !distribution ? (
                <DeferredChartLoading ariaLabel="Loading spend by category chart" />
              ) : pieSpendHasData ? (
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
              incomeByCategoryInView && pieIncomeHasData ? (
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
            {!incomeByCategoryInView ? (
              <ChartViewportFallback ariaLabel="Income by category chart loads when this section is visible" />
            ) : !distribution ? (
              <DeferredChartLoading ariaLabel="Loading income by category chart" />
            ) : pieIncomeHasData ? (
              <PieByCategoryChart
                data={pieIncomeForChart}
                hiddenLabels={hiddenIncomeCategories}
                hoveredLabel={hoveredIncomeCategory}
                animate={incomeByCategoryInView}
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
              !overviewReady ? (
                <DeferredChartLoading ariaLabel="Loading monthly expense and income chart" />
              ) : columnHasFlow ? (
                <ColumnChart
                  data={overviewColumn}
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
              !distribution ? (
                <DeferredChartLoading ariaLabel="Loading category spend trend chart" />
              ) : categoryTrendHasData ? (
                <StackedAreaChart
                  data={distribution.categoryByMonthStacked}
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
              !leaders ? (
                <DeferredChartLoading ariaLabel="Loading spend by tag chart" />
              ) : tagsHasData ? (
                <HorizontalBarChart
                  data={leaders.tagsSpend.map((t, i) => ({
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
              !leaders ? (
                <DeferredChartLoading ariaLabel="Loading top merchants chart" />
              ) : merchantsHasData ? (
                <HorizontalBarChart
                  data={leaders.merchantsSpend.map((m, i) => ({
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


      <Card
        className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_FULL}`}
        ref={recurringRef}
      >
        <h2 className="mb-2 font-display text-lg font-medium">Recurring spend</h2>
        <p className="mb-2 text-xs text-muted">
          Expenses posted from recurrence templates in this range.
        </p>
        <AnalyticsChartContainer>
          {!recurringInView ? (
            <ChartViewportFallback ariaLabel="Recurring spend chart loads when this section is visible" />
          ) : !leaders ? (
            <DeferredChartLoading ariaLabel="Loading recurring spend chart" />
          ) : recurringHasData ? (
            <HorizontalBarChart
              data={leaders.recurringSpend.map((r, i) => ({
                key: r.templateId ?? `r-${i}`,
                label: r.label,
                valueMinor: r.valueMinor,
              }))}
              formatValue={formatChartValue}
              animate={recurringInView}
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

      <div
        ref={transactionsRef}
        className="col-span-2 md:col-span-6 lg:col-span-12"
      >
        {transactionsInView && lookupsReady && overviewReady && leadersSectionReady ? (
          <AnalyticsTransactionsTableLazy
            filterQuery={filterQuery}
            activeWorkspaceId={workspaceKey}
            accounts={accounts}
            categories={categories}
            currency={defaultCurrency}
            deferFetchUntilVisible={false}
          />
        ) : (
          <MoneyAnalyticsTransactionsTableSkeleton />
        )}
      </div>
    </>
  );
}

function AnalyticsDashboardLoaded() {
  const { data: session, status } = useSession();
  const userSub = session?.user?.id;
  const {
    workspaceId: coreWorkspaceId,
    defaultCurrency,
    refreshWorkspaceCurrency,
    workspaceReady,
  } = useWorkspaceCurrency();
  const { resolved, style } = useTheme();
  const canRunMoneyQueries =
    status === "authenticated" && typeof window !== "undefined";

  const {
    ref: budgetRef,
    isInView: budgetInView,
  } = useInViewOnce("96px 0px");
  const {
    ref: sankeyRef,
    isInView: sankeyInView,
  } = useInViewOnce();
  const {
    ref: spendByCategoryRef,
    isInView: spendByCategoryInView,
  } = useInViewOnce("144px 0px");
  const {
    ref: monthlyColumnsRef,
    isInView: monthlyColumnsInView,
  } = useInViewOnce();
  const { ref: netFlowRef, isInView: netFlowInView } = useInViewOnce();
  const { ref: merchantsRef, isInView: merchantsInView } = useInViewOnce("144px 0px");
  const { ref: recurringRef, isInView: recurringInView } = useInViewOnce("160px 0px");
  const { ref: tagsRef, isInView: tagsInView } = useInViewOnce("144px 0px");
  const { ref: categoryTrendRef, isInView: categoryTrendInView } =
    useInViewOnce("144px 0px");
  const { ref: transactionsRef, isInView: transactionsInView } =
    useInViewOnce("240px 0px");

  const [pendingWorkspaceId, setPendingWorkspaceId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnalyticsFiltersValue>(() =>
    defaultAnalyticsFilters(),
  );
  const [applied, setApplied] = useState<AnalyticsFiltersValue>(() =>
    defaultAnalyticsFilters(),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isFilterPending, startFilterTransition] = useTransition();

  const workspaceStateQuery = useQuery({
    ...moneyWorkspaceStateQueryOptions(),
    enabled: canRunMoneyQueries,
  });

  const workspaces = useMemo(
    () =>
      (workspaceStateQuery.data?.workspaces ?? []) as AnalyticsWorkspaceRow[],
    [workspaceStateQuery.data?.workspaces],
  );
  const resolvedWorkspaceId = useMemo(() => {
    let resolvedId = coreWorkspaceId ?? "";
    if (!workspaces.some((workspace) => workspace.id === resolvedId)) {
      resolvedId =
        workspaces.find((workspace) => workspace.isDefault)?.id ??
        workspaces[0]?.id ??
        resolvedId;
    }
    return resolvedId;
  }, [coreWorkspaceId, workspaces]);
  const activeWorkspaceId = pendingWorkspaceId ?? resolvedWorkspaceId;
  const workspaceSyncPending =
    pendingWorkspaceId != null ||
    (resolvedWorkspaceId !== "" &&
      resolvedWorkspaceId !== (coreWorkspaceId ?? ""));

  const chartLookupsQuery = useQuery({
    ...moneyAnalyticsChartLookupsQueryOptions(activeWorkspaceId),
    enabled:
      canRunMoneyQueries &&
      workspaceReady &&
      !workspaceSyncPending &&
      Boolean(activeWorkspaceId),
  });
  const merchantLookupsQuery = useQuery({
    ...moneyAnalyticsMerchantLookupsQueryOptions(activeWorkspaceId),
    enabled:
      canRunMoneyQueries &&
      filtersOpen &&
      workspaceReady &&
      !workspaceSyncPending &&
      Boolean(activeWorkspaceId),
  });

  const accounts = useMemo(
    () =>
      (workspaceSyncPending
        ? []
        : (chartLookupsQuery.data?.moneyAccounts ?? [])) as AnalyticsLookupAccount[],
    [workspaceSyncPending, chartLookupsQuery.data?.moneyAccounts],
  );
  const categories = useMemo(
    () =>
      (workspaceSyncPending
        ? []
        : (chartLookupsQuery.data?.moneyCategories ?? [])) as MoneyCategoryRow[],
    [workspaceSyncPending, chartLookupsQuery.data?.moneyCategories],
  );
  const tags = useMemo(
    () =>
      (workspaceSyncPending
        ? []
        : (chartLookupsQuery.data?.moneyTags ?? [])) as AnalyticsLookupTag[],
    [workspaceSyncPending, chartLookupsQuery.data?.moneyTags],
  );
  const merchants = useMemo(
    () =>
      (workspaceSyncPending
        ? []
        : (merchantLookupsQuery.data?.moneyMerchants ?? [])) as AnalyticsLookupMerchant[],
    [workspaceSyncPending, merchantLookupsQuery.data?.moneyMerchants],
  );
  const lookupsReady = !workspaceSyncPending && chartLookupsQuery.isSuccess;

  const draftKey = useMemo(() => JSON.stringify(draft), [draft]);
  const appliedKey = useMemo(() => JSON.stringify(applied), [applied]);
  const dirty = draftKey !== appliedKey;
  const analyticsFilterQuery = useMemo(() => buildQuery(applied), [applied]);

  const autoSyncedWorkspaceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!resolvedWorkspaceId || resolvedWorkspaceId === (coreWorkspaceId ?? "")) {
      autoSyncedWorkspaceRef.current = null;
      return;
    }
    if (!workspaces.some((workspace) => workspace.id === resolvedWorkspaceId)) {
      return;
    }

    const syncKey = `${coreWorkspaceId ?? ""}:${resolvedWorkspaceId}`;
    if (autoSyncedWorkspaceRef.current === syncKey) return;
    autoSyncedWorkspaceRef.current = syncKey;

    let cancelled = false;
    void (async () => {
      try {
        await moneyGraphQLRequest(MONEY_SET_ACTIVE_WORKSPACE_MUTATION, {
          workspaceId: resolvedWorkspaceId,
        });
        if (cancelled) return;
        setError(null);
        await refreshWorkspaceCurrency();
      } catch (e: unknown) {
        if (cancelled) return;
        autoSyncedWorkspaceRef.current = null;
        setError(e instanceof Error ? e.message : "Error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coreWorkspaceId, refreshWorkspaceCurrency, resolvedWorkspaceId, workspaces]);

  const handleWorkspaceChange = useCallback(
    async (next: string) => {
      if (!next || next === activeWorkspaceId) return;
      setPendingWorkspaceId(next);
      setError(null);
      try {
        await moneyGraphQLRequest(MONEY_SET_ACTIVE_WORKSPACE_MUTATION, {
          workspaceId: next,
        });
        await refreshWorkspaceCurrency();
        const fresh = defaultAnalyticsFilters();
        setDraft(fresh);
        setApplied(fresh);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setPendingWorkspaceId(null);
      }
    },
    [activeWorkspaceId, refreshWorkspaceCurrency],
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

  const loadError =
    error ??
    (workspaceStateQuery.error instanceof Error
      ? workspaceStateQuery.error.message
      : null) ??
    (chartLookupsQuery.error instanceof Error
      ? chartLookupsQuery.error.message
      : null) ??
    (filtersOpen && merchantLookupsQuery.error instanceof Error
      ? merchantLookupsQuery.error.message
      : null);

  if (!workspaceReady && !workspaceStateQuery.data && !workspaceStateQuery.error) {
    return <MoneyAnalyticsPageSkeleton />;
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 md:mb-4 fx-fade-in">
        <p className="max-w-prose text-sm text-muted">
          Workspace-scoped aggregates for the range you set in Filter (default:
          start through end of the current calendar month). Apply to refresh
          charts.
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
            switchingWorkspace={workspaceSyncPending}
            userSub={userSub}
            onClose={() => setFiltersOpen(false)}
          />
        </Modal>
      ) : null}

      <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3">
        {loadError ? (
          <div className="col-span-2 md:col-span-6 lg:col-span-12">
            <Alert
              variant="error"
              title="Couldn’t load analytics"
              description={loadError}
            />
          </div>
        ) : null}

        {activeWorkspaceId && !workspaceSyncPending ? (
          <Suspense fallback={<MoneyAnalyticsChartsSkeleton />}>
            <AnalyticsSummaryShell
              applied={applied}
              filterQuery={analyticsFilterQuery}
              workspaceKey={activeWorkspaceId}
              defaultCurrency={defaultCurrency}
              budgetRef={budgetRef}
              sankeyRef={sankeyRef}
              spendByCategoryRef={spendByCategoryRef}
              monthlyColumnsRef={monthlyColumnsRef}
              netFlowRef={netFlowRef}
              merchantsRef={merchantsRef}
              recurringRef={recurringRef}
              tagsRef={tagsRef}
              categoryTrendRef={categoryTrendRef}
              transactionsRef={transactionsRef}
              budgetInView={budgetInView}
              sankeyInView={sankeyInView}
              spendByCategoryInView={spendByCategoryInView}
              monthlyColumnsInView={monthlyColumnsInView}
              netFlowInView={netFlowInView}
              merchantsInView={merchantsInView}
              recurringInView={recurringInView}
              tagsInView={tagsInView}
              categoryTrendInView={categoryTrendInView}
              transactionsInView={transactionsInView}
              resolved={resolved}
              style={style}
              lookupsReady={lookupsReady}
              categories={categories}
              accounts={accounts}
              tags={tags}
            />
          </Suspense>
        ) : (
          <MoneyAnalyticsChartsSkeleton />
        )}
      </div>
    </>
  );
}

export function AnalyticsDashboard() {
  return <AnalyticsDashboardLoaded />;
}
