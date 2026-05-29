"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import type { Ref } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  BudgetVsActualCard,
  CategorySpendTrendCard,
  CHART_CARD_HEIGHT_FULL,
  CHART_CARD_HEIGHT_HALF,
  IncomeByCategoryCard,
  IncomeVsExpenseCard,
  MoneyFlowSankeyCard,
  MonthlyColumnsCard,
  NetCumulativeFlowCard,
  RecurringSpendCard,
  SpendByCategoryCard,
  SpendByTagCard,
  TopMerchantsCard,
} from "@/components/analytics-chart-cards";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  MoneyAnalyticsChartsSkeleton,
  MoneyAnalyticsPageSkeleton,
  MoneyAnalyticsTransactionsTableSkeleton,
} from "@/components/money-analytics-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { AnalyticsStats } from "@/components/analytics-stats";
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
import { analyticsFiltersEqual } from "@/lib/analytics-graphql-filters";
import { formatMinor } from "@/lib/format-money";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import { MONEY_SET_ACTIVE_WORKSPACE_MUTATION } from "@/lib/money-gql-documents";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";
import {
  moneyAnalyticsBudgetsQueryOptions,
  moneyAnalyticsChartLookupsQueryOptions,
  moneyAnalyticsDistributionQueryOptions,
  moneyAnalyticsLeadersQueryOptions,
  moneyAnalyticsDashboardQueryOptions,
  moneyAnalyticsMerchantLookupsQueryOptions,
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

const AnalyticsFilters = dynamic(
  () =>
    import("@/components/analytics-filters").then((m) => ({
      default: m.AnalyticsFilters,
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
  const { data } = useQuery(
    moneyAnalyticsDashboardQueryOptions(props.workspaceKey, props.applied),
  );
  const summary = data?.moneyAnalyticsSummary as
    | MoneyAnalyticsSummaryPayload
    | undefined;
  const overview = data?.moneyAnalyticsOverview as
    | MoneyAnalyticsOverviewPayload
    | undefined;

  if (!summary || !overview) {
    return <MoneyAnalyticsChartsSkeleton />;
  }

  return (
    <AnalyticsChartsView summary={summary} overview={overview} {...props} />
  );
}

type AnalyticsChartsViewProps = AnalyticsStagesProps & {
  summary: MoneyAnalyticsSummaryPayload;
  overview: MoneyAnalyticsOverviewPayload;
};

function AnalyticsChartsView({
  summary,
  overview,
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

  const overviewReady = true;

  const { data: budgetsResponse } = useQuery({
    ...moneyAnalyticsBudgetsQueryOptions(workspaceKey, applied),
    enabled: budgetInView && lookupsReady && Boolean(workspaceKey),
  });
  const budgets =
    (budgetsResponse?.moneyAnalyticsBudgets as
      | MoneyAnalyticsBudgetPayload
      | undefined) ?? null;

  const { data: sankeyResponse } = useQuery({
    ...moneyAnalyticsSankeyQueryOptions(workspaceKey, applied),
    enabled: sankeyInView && Boolean(workspaceKey),
  });
  const sankeyPayload =
    (sankeyResponse?.moneyAnalyticsSankey as
      | MoneyAnalyticsSankeyPayload
      | undefined) ?? null;
  const distributionStageInView = spendByCategoryInView || categoryTrendInView;

  const { data: distributionResponse } = useQuery({
    ...moneyAnalyticsDistributionQueryOptions(workspaceKey, applied),
    enabled: distributionStageInView && Boolean(workspaceKey),
  });
  const distribution =
    (distributionResponse?.moneyAnalyticsDistribution as
      | MoneyAnalyticsDistributionPayload
      | undefined) ?? null;
  const leadersStageInView = merchantsInView || recurringInView || tagsInView;

  const { data: leadersResponse } = useQuery({
    ...moneyAnalyticsLeadersQueryOptions(workspaceKey, applied),
    enabled: leadersStageInView && Boolean(workspaceKey),
  });
  const leaders =
    (leadersResponse?.moneyAnalyticsLeaders as
      | MoneyAnalyticsLeadersPayload
      | undefined) ?? null;
  const incomeByCategoryInView = spendByCategoryInView;
  const summaryStats = summary.stats;
  const summaryRange = summary.range;
  const overviewColumn = useMemo(() => overview?.column ?? [], [overview?.column]);
  const overviewLineCompare = overview?.lineCompare;

  const pieSpendHasData = useMemo(
    () => distribution?.pieSpend.some((p) => p.valueMinor > 0) ?? false,
    [distribution?.pieSpend],
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
    () => distribution?.pieSpend.reduce((s, p) => s + p.valueMinor, 0) ?? 0,
    [distribution?.pieSpend],
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
    (minor: number) => formatMinor(minor, defaultCurrency),
    [defaultCurrency],
  );

  return (
    <>
      <AnalyticsStats
        stats={summaryStats}
        column={overviewColumn}
        range={summaryRange}
        currency={defaultCurrency}
      />

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
      />

      <IncomeVsExpenseCard
        overviewReady={overviewReady}
        summaryStats={summaryStats}
        divergingHasData={divergingHasData}
        formatChartValue={formatChartValue}
      />

      <BudgetVsActualCard
        cardRef={budgetRef}
        inView={budgetInView}
        lookupsReady={lookupsReady}
        budgets={budgets}
        budgetChartRows={budgetChartRows}
        budgetChartHasData={budgetChartHasData}
        formatChartValue={formatChartValue}
      />

      <MoneyFlowSankeyCard
        cardRef={sankeyRef}
        inView={sankeyInView}
        sankeyPayload={sankeyPayload}
        sankeyHasData={sankeyHasData}
        defaultCurrency={defaultCurrency}
      />

      <div className="col-span-2 grid min-w-0 grid-cols-1 gap-2 md:col-span-6 md:gap-3 lg:col-span-12 lg:grid-cols-3 lg:gap-3">
        <SpendByCategoryCard
          cardRef={spendByCategoryRef}
          inView={spendByCategoryInView}
          distribution={distribution}
          pieSpendHasData={pieSpendHasData}
          pieSpendTotal={pieSpendTotal}
          formatChartValue={formatChartValue}
          theme={theme}
          defaultCurrency={defaultCurrency}
        />
        <IncomeByCategoryCard
          inView={incomeByCategoryInView}
          distribution={distribution}
          pieIncomeHasData={pieIncomeHasData}
          pieIncomeTotal={pieIncomeTotal}
          formatChartValue={formatChartValue}
          theme={theme}
          defaultCurrency={defaultCurrency}
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
        />
        <CategorySpendTrendCard
          cardRef={categoryTrendRef}
          inView={categoryTrendInView}
          distribution={distribution}
          categoryTrendHasData={categoryTrendHasData}
          formatChartValue={formatChartValue}
          theme={theme}
        />
        <SpendByTagCard
          cardRef={tagsRef}
          inView={tagsInView}
          leaders={leaders}
          tagsHasData={tagsHasData}
          formatChartValue={formatChartValue}
        />
        <TopMerchantsCard
          cardRef={merchantsRef}
          inView={merchantsInView}
          leaders={leaders}
          merchantsHasData={merchantsHasData}
          formatChartValue={formatChartValue}
        />
      </div>

      <RecurringSpendCard
        cardRef={recurringRef}
        inView={recurringInView}
        leaders={leaders}
        recurringHasData={recurringHasData}
        formatChartValue={formatChartValue}
      />

      <div
        ref={transactionsRef}
        className="col-span-2 md:col-span-6 lg:col-span-12"
      >
        {transactionsInView && lookupsReady && overviewReady ? (
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

function AnalyticsDashboardLoaded({
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
  const canRunMoneyQueries = authenticated && typeof window !== "undefined";

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

  const dirty = !analyticsFiltersEqual(draft, applied);
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
        ) : (
          <MoneyAnalyticsChartsSkeleton />
        )}
      </div>
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
  return (
    <AnalyticsDashboardLoaded userSub={userSub} authenticated={authenticated} />
  );
}
