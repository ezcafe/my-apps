"use client";

import { presentClientError, queryErrorMessage } from "@/lib/user-facing-error";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  CHART_CARD_HEIGHT_FULL,
  CHART_CARD_LAYOUT,
} from "@/components/analytics-chart-layout";
import {
  AnalyticsStatsSkeleton,
  MoneyAnalyticsChartsSkeleton,
  MoneyAnalyticsFiltersBarSkeleton,
  MoneyAnalyticsPageSkeleton,
  ANALYTICS_GRID_CLASS,
} from "@/components/money-analytics-skeleton";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { AnalyticsStats } from "@/components/analytics-stats";
import { AnalyticsPeriodChip } from "@/components/analytics-period-chip";
import { useSetAppHeader } from "@/components/app-header-override";
import { useTheme } from "@/components/theme-provider";
import { Alert } from "@/components/ui/alert";
import { MONEY_FULL_SPAN, MONEY_DASHBOARD_STACK } from "@/lib/money-layout";
import { cn } from "@/lib/cn";
import {
  defaultAnalyticsFilters,
  type AnalyticsFiltersValue,
  type AnalyticsLookupAccount,
  type AnalyticsLookupMerchant,
  type AnalyticsLookupRecurrence,
  type AnalyticsLookupTag,
  type AnalyticsWorkspaceRow,
} from "@/components/analytics-filters";
import { budgetRowsForChart } from "@/lib/analytics-budget-label";
import type { AnalyticsChartDrilldownPayload } from "@/lib/analytics-build-query";
import { analyticsFiltersEqual } from "@/lib/analytics-graphql-filters";
import { formatCompactMinor } from "@/lib/format-money";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import { MONEY_SET_ACTIVE_WORKSPACE_MUTATION } from "@/lib/money-gql-documents";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";
import { IncomeVsExpenseCard } from "@/components/analytics-chart-cards/income-vs-expense-card";
import { SpendByCategoryCard } from "@/components/analytics-chart-cards/spend-by-category-card";
import {
  moneyAnalyticsAtfQueryOptions,
  moneyAnalyticsBudgetsQueryOptions,
  moneyAnalyticsChartLookupsQueryOptions,
  moneyAnalyticsInsightsQueryOptions,
  moneyAnalyticsLeadersQueryOptions,
  moneyAnalyticsMerchantLookupsQueryOptions,
  moneyAnalyticsRecurrenceLookupsQueryOptions,
  moneyAnalyticsSankeyQueryOptions,
  moneyBootstrapQueryOptions,
  type MoneyAccountLookup,
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
import {
  buildMoneyAnalyticsFilterQuery,
  defaultFiltersForLedgerPreset,
  MONEY_LEDGER_SCOPES,
  moneyLedgerScopePreset,
  parseMoneyLedgerScopeId,
  type MoneyLedgerScopeId,
} from "@/lib/money-ledger-presets";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const chartCardLoading = () => (
  <Card
    className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_FULL}`}
  >
    <Skeleton className="mb-2 h-6 w-40 rounded-[var(--radius-sm)]" />
    <Skeleton className="mb-2 h-4 w-56 max-w-full rounded-[var(--radius-sm)]" />
    <Skeleton className="min-h-0 w-full flex-1 rounded-[var(--radius-sm)]" />
  </Card>
);

const NetCumulativeFlowCard = dynamic(
  () => import("@/components/analytics-chart-cards/net-cumulative-flow-card"),
  { loading: chartCardLoading, ssr: false },
);
const BudgetVsActualCard = dynamic(
  () => import("@/components/analytics-chart-cards/budget-vs-actual-card"),
  { ssr: false },
);
const MoneyFlowSankeyCard = dynamic(
  () => import("@/components/analytics-chart-cards/money-flow-sankey-card"),
  { ssr: false },
);
const IncomeByCategoryCard = dynamic(
  () => import("@/components/analytics-chart-cards/income-by-category-card"),
  { ssr: false },
);
const MonthlyColumnsCard = dynamic(
  () => import("@/components/analytics-chart-cards/monthly-columns-card"),
  { ssr: false },
);
const CategorySpendTrendCard = dynamic(
  () => import("@/components/analytics-chart-cards/category-spend-trend-card"),
  { ssr: false },
);
const SpendByTagCard = dynamic(
  () => import("@/components/analytics-chart-cards/spend-by-tag-card"),
  { ssr: false },
);
const TopMerchantsCard = dynamic(
  () => import("@/components/analytics-chart-cards/top-merchants-card"),
  { ssr: false },
);
const RecurringSpendCard = dynamic(
  () => import("@/components/analytics-chart-cards/recurring-spend-card"),
  { ssr: false },
);

const AnalyticsFiltersBar = dynamic(
  () =>
    import("@/components/analytics-filters").then((m) => ({
      default: m.AnalyticsFiltersBar,
    })),
  {
    loading: () => <MoneyAnalyticsFiltersBarSkeleton />,
  },
);

const AnalyticsChartDrilldownModal = dynamic(
  () =>
    import("@/components/analytics-chart-drilldown-modal").then((m) => ({
      default: m.AnalyticsChartDrilldownModal,
    })),
  { ssr: false },
);

type AnalyticsInsightsBodyProps = {
  filterQuery: string;
  workspaceKey: string;
  defaultCurrency: string;
  moreInsights: boolean;
  onExpandMoreInsights: () => void;
  resolved: ReturnType<typeof useTheme>["resolved"];
  style: ReturnType<typeof useTheme>["style"];
  lookupsReady: boolean;
  categories: MoneyCategoryRow[];
  accounts: AnalyticsLookupAccount[];
  tags: AnalyticsLookupTag[];
  onChartDrilldown: (payload: AnalyticsChartDrilldownPayload) => void;
  /** When parent already loaded ATF summary (KPI row above filters). */
  summary: MoneyAnalyticsSummaryPayload | null;
  atfPieSpend?: MoneyAnalyticsDistributionPayload["pieSpend"];
};

function AnalyticsInsightsBody({
  filterQuery,
  workspaceKey,
  defaultCurrency,
  moreInsights,
  onExpandMoreInsights,
  resolved,
  style,
  lookupsReady,
  categories,
  accounts,
  tags,
  onChartDrilldown,
  summary,
  atfPieSpend,
}: AnalyticsInsightsBodyProps) {
  const insightsQuery = useQuery({
    ...moneyAnalyticsInsightsQueryOptions(workspaceKey, filterQuery),
    enabled: moreInsights && Boolean(workspaceKey),
  });
  const insights = insightsQuery.data?.moneyAnalyticsInsights;
  const overview = insights?.overview ?? null;
  const distribution = insights?.distribution ?? null;
  const spendDistribution: MoneyAnalyticsDistributionPayload | null =
    atfPieSpend || distribution
      ? {
          pieSpend: distribution?.pieSpend ?? atfPieSpend ?? [],
          pieIncome: distribution?.pieIncome ?? [],
          categoryByMonthStacked: distribution?.categoryByMonthStacked ?? [],
        }
      : null;

  if (!summary) {
    return <MoneyAnalyticsChartsSkeleton />;
  }

  return (
    <AnalyticsChartsView
      summary={summary}
      spendDistribution={spendDistribution}
      distribution={distribution}
      overview={overview}
      overviewReady={moreInsights && overview != null}
      moreInsights={moreInsights}
      onExpandMoreInsights={onExpandMoreInsights}
      filterQuery={filterQuery}
      workspaceKey={workspaceKey}
      defaultCurrency={defaultCurrency}
      resolved={resolved}
      style={style}
      lookupsReady={lookupsReady}
      categories={categories}
      accounts={accounts}
      tags={tags}
      onChartDrilldown={onChartDrilldown}
    />
  );
}

type AnalyticsChartsViewProps = {
  summary: MoneyAnalyticsSummaryPayload;
  spendDistribution: MoneyAnalyticsDistributionPayload | null;
  distribution: MoneyAnalyticsDistributionPayload | null;
  overview: MoneyAnalyticsOverviewPayload | null;
  overviewReady: boolean;
  moreInsights: boolean;
  onExpandMoreInsights: () => void;
  filterQuery: string;
  workspaceKey: string;
  defaultCurrency: string;
  resolved: ReturnType<typeof useTheme>["resolved"];
  style: ReturnType<typeof useTheme>["style"];
  lookupsReady: boolean;
  categories: MoneyCategoryRow[];
  accounts: AnalyticsLookupAccount[];
  tags: AnalyticsLookupTag[];
  onChartDrilldown: (payload: AnalyticsChartDrilldownPayload) => void;
};

function AnalyticsChartsView({
  summary,
  spendDistribution,
  distribution,
  overview,
  overviewReady,
  moreInsights,
  onExpandMoreInsights,
  filterQuery,
  workspaceKey,
  defaultCurrency,
  resolved,
  style,
  lookupsReady,
  categories,
  accounts,
  tags,
  onChartDrilldown,
}: AnalyticsChartsViewProps) {
  const {
    ref: budgetRef,
    isInView: budgetInView,
  } = useInViewOnce("96px 0px");
  const { ref: sankeyRef, isInView: sankeyInView } = useInViewOnce();
  const {
    ref: monthlyColumnsRef,
    isInView: monthlyColumnsInView,
  } = useInViewOnce();
  const { ref: netFlowRef, isInView: netFlowInView } = useInViewOnce();
  const {
    ref: merchantsRef,
    isInView: merchantsInView,
  } = useInViewOnce("144px 0px");
  const {
    ref: recurringRef,
    isInView: recurringInView,
  } = useInViewOnce("160px 0px");
  const { ref: tagsRef, isInView: tagsInView } = useInViewOnce("144px 0px");
  const {
    ref: categoryTrendRef,
    isInView: categoryTrendInView,
  } = useInViewOnce("144px 0px");

  const { data: budgetsResponse } = useQuery({
    ...moneyAnalyticsBudgetsQueryOptions(workspaceKey, filterQuery),
    enabled: moreInsights && budgetInView && lookupsReady && Boolean(workspaceKey),
  });
  const budgets =
    (budgetsResponse?.moneyAnalyticsBudgets as
      | MoneyAnalyticsBudgetPayload
      | undefined) ?? null;

  const { data: sankeyResponse } = useQuery({
    ...moneyAnalyticsSankeyQueryOptions(workspaceKey, filterQuery),
    enabled: moreInsights && sankeyInView && Boolean(workspaceKey),
  });
  const sankeyPayload =
    (sankeyResponse?.moneyAnalyticsSankey as
      | MoneyAnalyticsSankeyPayload
      | undefined) ?? null;

  const leadersStageInView = merchantsInView || recurringInView || tagsInView;
  const { data: leadersResponse } = useQuery({
    ...moneyAnalyticsLeadersQueryOptions(workspaceKey, filterQuery),
    enabled: moreInsights && leadersStageInView && Boolean(workspaceKey),
  });
  const leaders =
    (leadersResponse?.moneyAnalyticsLeaders as
      | MoneyAnalyticsLeadersPayload
      | undefined) ?? null;

  const summaryStats = summary.stats;
  const overviewColumn = useMemo(() => overview?.column ?? [], [overview?.column]);
  const overviewLineCompare = overview?.lineCompare;

  const pieSpendHasData = useMemo(
    () => spendDistribution?.pieSpend.some((p) => p.valueMinor > 0) ?? false,
    [spendDistribution?.pieSpend],
  );
  const pieIncomeHasData = useMemo(
    () => distribution?.pieIncome.some((p) => p.valueMinor > 0) ?? false,
    [distribution?.pieIncome],
  );
  const columnHasFlow = useMemo(
    () =>
      overviewColumn.some((c) => c.expenseMinor > 0 || c.incomeMinor > 0),
    [overviewColumn],
  );
  const columnExpenseTotal = useMemo(
    () => overviewColumn.reduce((s, c) => s + c.expenseMinor, 0),
    [overviewColumn],
  );
  const columnIncomeTotal = useMemo(
    () => overviewColumn.reduce((s, c) => s + c.incomeMinor, 0),
    [overviewColumn],
  );
  const pieSpendTotal = useMemo(
    () =>
      spendDistribution?.pieSpend.reduce((s, p) => s + p.valueMinor, 0) ?? 0,
    [spendDistribution?.pieSpend],
  );
  const pieIncomeTotal = useMemo(
    () => distribution?.pieIncome.reduce((s, p) => s + p.valueMinor, 0) ?? 0,
    [distribution?.pieIncome],
  );
  const sankeyHasData = useMemo(
    () => (sankeyPayload?.sankey.links.length ?? 0) > 0,
    [sankeyPayload?.sankey.links.length],
  );
  const lineHasData = useMemo(
    () =>
      (overview?.line.some((p) => p.netMinor !== 0) ?? false) ||
      (overviewLineCompare?.points.some((p) => p.netMinor !== 0) ?? false),
    [overview?.line, overviewLineCompare?.points],
  );
  const merchantsHasData = useMemo(
    () => leaders?.merchantsSpend.some((m) => m.valueMinor > 0) ?? false,
    [leaders?.merchantsSpend],
  );
  const tagsHasData = useMemo(
    () => leaders?.tagsSpend.some((t) => t.valueMinor > 0) ?? false,
    [leaders?.tagsSpend],
  );
  const categoryTrendHasData = useMemo(
    () =>
      distribution?.categoryByMonthStacked.some((m) =>
        m.series.some((s) => s.valueMinor > 0),
      ) ?? false,
    [distribution?.categoryByMonthStacked],
  );
  const recurringHasData = useMemo(
    () => leaders?.recurringSpend.some((r) => r.valueMinor > 0) ?? false,
    [leaders?.recurringSpend],
  );
  const divergingHasData = useMemo(
    () => summaryStats.incomeMinor > 0 || summaryStats.expenseMinor > 0,
    [summaryStats.expenseMinor, summaryStats.incomeMinor],
  );
  const budgetChartRows = useMemo(
    () =>
      budgets
        ? budgetRowsForChart(budgets.budgets, categories, accounts, tags)
        : [],
    [budgets, categories, accounts, tags],
  );
  const budgetChartHasData = useMemo(
    () => budgetChartRows.some((b) => b.valueMinor > 0 || (b.limitMinor ?? 0) > 0),
    [budgetChartRows],
  );

  const { formatMonthYear } = useFormatDate();
  const lineCompareLabel = overviewLineCompare
    ? formatMonthYear(overviewLineCompare.fromDate)
    : null;

  const isCurrentMonthCompare = Boolean(overviewLineCompare);
  const theme = useMemo(() => ({ resolved, style }), [resolved, style]);

  const formatChartValue = useCallback(
    (minor: number) => formatCompactMinor(minor, defaultCurrency),
    [defaultCurrency],
  );

  const spendReady = spendDistribution != null;

  return (
    <>
      <div className="col-span-2 grid min-w-0 grid-cols-1 gap-2 md:col-span-6 md:grid-cols-2 md:gap-3 lg:col-span-12">
        <IncomeVsExpenseCard
          overviewReady
          summaryStats={summaryStats}
          divergingHasData={divergingHasData}
          formatChartValue={formatChartValue}
          baseFilterQuery={filterQuery}
          onDrilldown={onChartDrilldown}
        />
        <SpendByCategoryCard
          cardRef={undefined}
          inView={spendReady}
          distribution={spendDistribution}
          pieSpendHasData={pieSpendHasData}
          pieSpendTotal={pieSpendTotal}
          formatChartValue={formatChartValue}
          theme={theme}
          defaultCurrency={defaultCurrency}
          baseFilterQuery={filterQuery}
          onDrilldown={onChartDrilldown}
        />
      </div>

      {!moreInsights ? (
        <div className="col-span-2 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3 md:col-span-6 lg:col-span-12">
          {(
            [
              { title: "Budget vs actual", hint: "See if you are on track this month" },
              { title: "Top merchants", hint: "Where you spend the most" },
              { title: "Recurring spend", hint: "Subscriptions and repeating bills" },
            ] as const
          ).map(({ title, hint }) => (
            <button
              key={title}
              type="button"
              onClick={onExpandMoreInsights}
              className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-left transition-colors duration-200 hover:bg-muted-surface fx-press"
            >
              <span className="block text-sm font-medium text-foreground">{title}</span>
              <span className="mt-1 block text-sm text-muted">{hint}</span>
            </button>
          ))}
        </div>
      ) : null}

      {moreInsights ? (
        <>
          <NetCumulativeFlowCard
            cardRef={netFlowRef}
            inView={netFlowInView}
            overviewReady={overviewReady}
            overview={overview}
            lineHasData={lineHasData}
            lineCompareLabel={lineCompareLabel}
            isCurrentMonthCompare={isCurrentMonthCompare}
            defaultCurrency={defaultCurrency}
            theme={theme}
            baseFilterQuery={filterQuery}
            onDrilldown={onChartDrilldown}
          />

          <MoneyFlowSankeyCard
            cardRef={sankeyRef}
            inView={sankeyInView}
            sankeyPayload={sankeyPayload}
            sankeyHasData={sankeyHasData}
            defaultCurrency={defaultCurrency}
            baseFilterQuery={filterQuery}
            onDrilldown={onChartDrilldown}
          />

          <div className="col-span-2 grid min-w-0 grid-cols-1 gap-2 md:col-span-6 md:gap-3 lg:col-span-12 lg:grid-cols-3 lg:gap-3">
            <IncomeByCategoryCard
              inView={moreInsights}
              distribution={distribution}
              pieIncomeHasData={pieIncomeHasData}
              pieIncomeTotal={pieIncomeTotal}
              formatChartValue={formatChartValue}
              theme={theme}
              defaultCurrency={defaultCurrency}
              baseFilterQuery={filterQuery}
              onDrilldown={onChartDrilldown}
            />
            <MonthlyColumnsCard
              cardRef={monthlyColumnsRef}
              inView={monthlyColumnsInView}
              overviewReady={overviewReady}
              overviewColumn={overviewColumn}
              columnHasFlow={columnHasFlow}
              columnExpenseTotal={columnExpenseTotal}
              columnIncomeTotal={columnIncomeTotal}
              formatChartValue={formatChartValue}
              theme={theme}
              defaultCurrency={defaultCurrency}
              baseFilterQuery={filterQuery}
              onDrilldown={onChartDrilldown}
            />
            <CategorySpendTrendCard
              cardRef={categoryTrendRef}
              inView={categoryTrendInView}
              distribution={distribution}
              categoryTrendHasData={categoryTrendHasData}
              formatChartValue={formatChartValue}
              theme={theme}
              baseFilterQuery={filterQuery}
              onDrilldown={onChartDrilldown}
            />
            <SpendByTagCard
              cardRef={tagsRef}
              inView={tagsInView}
              leaders={leaders}
              tagsHasData={tagsHasData}
              formatChartValue={formatChartValue}
              baseFilterQuery={filterQuery}
              onDrilldown={onChartDrilldown}
            />
            <TopMerchantsCard
              cardRef={merchantsRef}
              inView={merchantsInView}
              leaders={leaders}
              merchantsHasData={merchantsHasData}
              formatChartValue={formatChartValue}
              baseFilterQuery={filterQuery}
              onDrilldown={onChartDrilldown}
            />
            <BudgetVsActualCard
              cardRef={budgetRef}
              inView={budgetInView}
              lookupsReady={lookupsReady}
              budgets={budgets}
              budgetChartRows={budgetChartRows}
              budgetChartHasData={budgetChartHasData}
              formatChartValue={formatChartValue}
              baseFilterQuery={filterQuery}
              onDrilldown={onChartDrilldown}
            />
          </div>

          <RecurringSpendCard
            cardRef={recurringRef}
            inView={recurringInView}
            leaders={leaders}
            recurringHasData={recurringHasData}
            formatChartValue={formatChartValue}
            baseFilterQuery={filterQuery}
            onDrilldown={onChartDrilldown}
          />
        </>
      ) : null}
    </>
  );
}

export function AnalyticsDashboard({
  userSub,
  authenticated,
}: {
  userSub?: string;
  authenticated: boolean;
}) {
  const {
    workspaceId: coreWorkspaceId,
    defaultCurrency,
    refreshWorkspaceCurrency,
    workspaceReady,
  } = useWorkspaceCurrency();
  const { resolved, style } = useTheme();
  const canRunMoneyQueries = authenticated;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ledgerScope = useMemo(
    () => parseMoneyLedgerScopeId(searchParams.get("ledger")),
    [searchParams],
  );

  const setLedgerScope = useCallback(
    (scope: MoneyLedgerScopeId) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (scope === "all") sp.delete("ledger");
      else sp.set("ledger", scope);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [moreInsights, setMoreInsights] = useState(false);
  const [advancedFilterLookups, setAdvancedFilterLookups] = useState(false);
  const needAdvancedLookups = moreInsights || advancedFilterLookups;

  const [pendingWorkspaceId, setPendingWorkspaceId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [chartDrilldown, setChartDrilldown] =
    useState<AnalyticsChartDrilldownPayload | null>(null);
  const handleChartDrilldown = useCallback(
    (payload: AnalyticsChartDrilldownPayload) => setChartDrilldown(payload),
    [],
  );
  const [draft, setDraft] = useState<AnalyticsFiltersValue>(() =>
    defaultAnalyticsFilters(),
  );
  const [applied, setApplied] = useState<AnalyticsFiltersValue>(() =>
    defaultAnalyticsFilters(),
  );
  const [isFilterPending, startFilterTransition] = useTransition();

  const bootstrapQuery = useQuery({
    ...moneyBootstrapQueryOptions(),
    enabled: canRunMoneyQueries,
  });

  const workspaces = useMemo(
    () =>
      (bootstrapQuery.data?.workspaces ?? []) as AnalyticsWorkspaceRow[],
    [bootstrapQuery.data?.workspaces],
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
      workspaceReady &&
      !workspaceSyncPending &&
      Boolean(activeWorkspaceId) &&
      needAdvancedLookups,
  });
  const recurrenceLookupsQuery = useQuery({
    ...moneyAnalyticsRecurrenceLookupsQueryOptions(activeWorkspaceId),
    enabled:
      canRunMoneyQueries &&
      workspaceReady &&
      !workspaceSyncPending &&
      Boolean(activeWorkspaceId) &&
      needAdvancedLookups,
  });

  const accounts = useMemo(
    () =>
      (workspaceSyncPending
        ? []
        : (chartLookupsQuery.data?.moneyAccounts ?? [])) as MoneyAccountLookup[],
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
  const recurrenceTemplates = useMemo(
    () =>
      (workspaceSyncPending
        ? []
        : (recurrenceLookupsQuery.data?.moneyRecurrenceTemplates ?? [])) as AnalyticsLookupRecurrence[],
    [workspaceSyncPending, recurrenceLookupsQuery.data?.moneyRecurrenceTemplates],
  );
  const lookupsReady = !workspaceSyncPending && chartLookupsQuery.isSuccess;

  const ledgerPreset = useMemo(
    () => moneyLedgerScopePreset(ledgerScope),
    [ledgerScope],
  );

  const pageDefaultFilters = useCallback(
    () => defaultFiltersForLedgerPreset(ledgerPreset, accounts, categories),
    [ledgerPreset, accounts, categories],
  );

  const dirty = !analyticsFiltersEqual(draft, applied);
  const analyticsFilterQuery = useMemo(
    () => buildMoneyAnalyticsFilterQuery(applied, ledgerScope, categories),
    [applied, ledgerScope, categories],
  );

  const autoSyncedWorkspaceRef = useRef<string | null>(null);
  const seededFiltersKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lookupsReady) return;
    const key = `${activeWorkspaceId}:${ledgerScope}`;
    if (seededFiltersKeyRef.current === key) return;
    const hadPriorSeed = seededFiltersKeyRef.current != null;
    seededFiltersKeyRef.current = key;

    // First paint with Ledger "All": keep empty month defaults.
    if (!ledgerPreset && !hadPriorSeed) return;

    const next = pageDefaultFilters();
    if (hadPriorSeed) {
      setDraft((d) => ({
        ...next,
        fromDate: d.fromDate,
        toDate: d.toDate,
        merchantIds: d.merchantIds,
        tagIds: d.tagIds,
        recurrence: d.recurrence,
        recurrenceSourceIds: d.recurrenceSourceIds,
      }));
      setApplied((a) => ({
        ...next,
        fromDate: a.fromDate,
        toDate: a.toDate,
        merchantIds: a.merchantIds,
        tagIds: a.tagIds,
        recurrence: a.recurrence,
        recurrenceSourceIds: a.recurrenceSourceIds,
      }));
    } else {
      setDraft(next);
      setApplied(next);
    }
  }, [
    activeWorkspaceId,
    ledgerPreset,
    ledgerScope,
    lookupsReady,
    pageDefaultFilters,
  ]);

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
        setError(presentClientError("analytics-dashboard", e));
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
        seededFiltersKeyRef.current = null;
        const fresh = defaultAnalyticsFilters();
        setDraft(fresh);
        setApplied(fresh);
        setLedgerScope("all");
      } catch (e: unknown) {
        setError(presentClientError("analytics-dashboard", e));
      } finally {
        setPendingWorkspaceId(null);
      }
    },
    [activeWorkspaceId, refreshWorkspaceCurrency, setLedgerScope],
  );

  const handleApply = useCallback(() => {
    startFilterTransition(() => {
      setApplied(draft);
    });
  }, [draft]);

  const handleReset = useCallback(() => {
    seededFiltersKeyRef.current = null;
    const fresh = defaultAnalyticsFilters();
    setDraft(fresh);
    setApplied(fresh);
    setLedgerScope("all");
  }, [setLedgerScope]);

  const loadError =
    error ??
    (queryErrorMessage(bootstrapQuery.error)) ??
    (queryErrorMessage(chartLookupsQuery.error)) ??
    (queryErrorMessage(merchantLookupsQuery.error)) ??
    (queryErrorMessage(recurrenceLookupsQuery.error));

  useSetAppHeader({
    meta: "Income, spending, and category trends for the selected range.",
  });

  const atfQuery = useQuery({
    ...moneyAnalyticsAtfQueryOptions(activeWorkspaceId, analyticsFilterQuery),
    enabled:
      Boolean(activeWorkspaceId) &&
      !workspaceSyncPending &&
      lookupsReady,
  });
  const atfSummary = (atfQuery.data?.moneyAnalyticsAtf.summary as
    | MoneyAnalyticsSummaryPayload
    | undefined) ?? null;
  const atfPieSpend = atfQuery.data?.moneyAnalyticsAtf.pieSpend;

  if (!workspaceReady && !bootstrapQuery.data && !bootstrapQuery.error) {
    return <MoneyAnalyticsPageSkeleton />;
  }

  return (
    <div className={cn(MONEY_FULL_SPAN, MONEY_DASHBOARD_STACK)}>
      <AnalyticsPeriodChip
        fromDate={applied.fromDate}
        toDate={applied.toDate}
        dirty={dirty}
      />

      <AnalyticsFiltersBar
        viewFilter={{
          menuLabel: "Ledger",
          value: ledgerScope,
          defaultValue: "all",
          options: MONEY_LEDGER_SCOPES.map(({ id, label }) => ({ id, label })),
          onChange: (id) => setLedgerScope(id as MoneyLedgerScopeId),
        }}
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
        recurrenceTemplates={recurrenceTemplates}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onWorkspaceChange={handleWorkspaceChange}
        switchingWorkspace={workspaceSyncPending}
        userSub={userSub}
        onAdvancedFiltersNeeded={() => setAdvancedFilterLookups(true)}
      />

      {loadError ? (
        <Alert
          variant="error"
          title="Couldn’t load analytics"
          description={loadError}
        />
      ) : null}

      {atfSummary ? (
        <section aria-label="Summary metrics">
          <AnalyticsStats
            stats={atfSummary.stats}
            range={atfSummary.range}
            currency={defaultCurrency}
            showPeriodCaption={false}
          />
        </section>
      ) : activeWorkspaceId && !workspaceSyncPending ? (
        <AnalyticsStatsSkeleton showPeriodLine={false} />
      ) : null}

      {activeWorkspaceId && !workspaceSyncPending ? (
        <section aria-label="Insights dashboard" className={ANALYTICS_GRID_CLASS}>
          <AnalyticsInsightsBody
            filterQuery={analyticsFilterQuery}
            workspaceKey={activeWorkspaceId}
            defaultCurrency={defaultCurrency}
            moreInsights={moreInsights}
            onExpandMoreInsights={() => setMoreInsights(true)}
            resolved={resolved}
            style={style}
            lookupsReady={lookupsReady}
            categories={categories}
            accounts={accounts}
            tags={tags}
            onChartDrilldown={handleChartDrilldown}
            summary={atfSummary}
            atfPieSpend={atfPieSpend}
          />
        </section>
      ) : (
        <MoneyAnalyticsChartsSkeleton />
      )}

      {chartDrilldown != null ? (
        <AnalyticsChartDrilldownModal
          open
          onClose={() => setChartDrilldown(null)}
          title={chartDrilldown.title}
          filterQuery={chartDrilldown.filterQuery}
          activeWorkspaceId={activeWorkspaceId}
          accounts={accounts}
          categories={categories}
          currency={defaultCurrency}
        />
      ) : null}
    </div>
  );
}

