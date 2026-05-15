"use client";

import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import type { Ref } from "react";
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
import { AnalyticsBudgetsSection } from "@/components/analytics-budgets-section";
import { AnalyticsStats } from "@/components/analytics-stats";
import { AnalyticsTransactionsTable } from "@/components/analytics-transactions-table";
import { chartExpenseHotPastel, colorByIndex } from "@/components/charts/chart-colors";
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
import { isCurrentCalendarMonthRange } from "@/lib/analytics-line-series";
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

function ChartViewportFallback({
  minHeight,
  ariaLabel,
}: {
  minHeight: string;
  ariaLabel: string;
}) {
  return (
    <Skeleton
      className={`flex w-full min-h-0 min-w-0 items-center justify-center text-xs text-muted ${minHeight}`}
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
      <Skeleton className="col-span-2 h-80 md:col-span-6 lg:col-span-12" />
      <Skeleton className="col-span-2 h-60 md:col-span-6 lg:col-span-6" />
      <Skeleton className="col-span-2 h-60 md:col-span-6 lg:col-span-6" />
      <Skeleton className="col-span-2 h-60 md:col-span-6 lg:col-span-12" />
    </div>
  );
}

function AnalyticsChartsSkeleton() {
  return (
    <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3">
      <Skeleton className="col-span-2 h-24 md:col-span-6 lg:col-span-12" />
      <Skeleton className="col-span-2 h-80 md:col-span-6 lg:col-span-12" />
      <Skeleton className="col-span-2 h-60 md:col-span-6 lg:col-span-6" />
      <Skeleton className="col-span-2 h-60 md:col-span-6 lg:col-span-6" />
      <Skeleton className="col-span-2 h-60 md:col-span-6 lg:col-span-12" />
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
  spendByCategoryInView: boolean;
  monthlyColumnsInView: boolean;
  netFlowInView: boolean;
  resolved: ReturnType<typeof useTheme>["resolved"];
  style: ReturnType<typeof useTheme>["style"];
  categories: MoneyCategoryRow[];
  accounts: AnalyticsLookupAccount[];
  tags: AnalyticsLookupTag[];
};

function AnalyticsChartsShell(props: AnalyticsChartsShellProps) {
  const {
    categories,
    accounts,
    tags,
    ...rest
  } = props;

  const { data } = useSuspenseQuery(
    moneyAnalyticsPageQueryOptions(rest.workspaceKey, rest.applied),
  );

  const analytics = data.moneyAnalytics as MoneyAnalyticsPayload;
  const budgets = data.moneyBudgets;

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
  const sankeyHasData = analytics.sankey.links.length > 0;
  const lineHasData =
    analytics.line.some((p) => p.netMinor !== 0) ||
    (analytics.lineCompare?.points.some((p) => p.netMinor !== 0) ?? false);

  const { formatMonthYear } = useFormatDate();
  const lineCompareLabel = analytics.lineCompare
    ? formatMonthYear(analytics.lineCompare.fromDate)
    : null;

  const {
    spendByCategoryRef,
    monthlyColumnsRef,
    netFlowRef,
    spendByCategoryInView,
    monthlyColumnsInView,
    netFlowInView,
    resolved,
    style,
    defaultCurrency,
    applied,
    workspaceKey,
  } = rest;

  const showNetFlow = useMemo(() => {
    const defaults = defaultAnalyticsFilters();
    const fromDate = applied.fromDate || defaults.fromDate;
    const toDate = applied.toDate || defaults.toDate;
    return isCurrentCalendarMonthRange(fromDate, toDate);
  }, [applied.fromDate, applied.toDate]);

  return (
    <>
      <AnalyticsStats
        stats={analytics.stats}
        column={analytics.column}
        range={analytics.range}
        currency={defaultCurrency}
      />

      <Card className="col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12">
        <h2 className="mb-1 font-display text-lg font-medium">Money flow</h2>
        <p className="mb-2 text-xs text-muted">
          Expenses run from accounts to categories (through account budgets when set), then into
          category or whole-workspace budgets when applicable. Income runs from categories into
          accounts. Tag budgets are listed under Budgets only.
        </p>
        <div className="relative h-[320px] w-full min-h-0 min-w-0 text-foreground">
          {sankeyHasData ? (
            <div className="absolute inset-0 min-h-0 min-w-0">
              <SankeyChart
                nodes={analytics.sankey.nodes}
                links={analytics.sankey.links}
                currency={defaultCurrency}
              />
            </div>
          ) : (
            <AnalyticsEmptyState
              icon="flow"
              title="No money flow for this range"
              description="Add categorized expenses or income, or widen the date range."
              minHeightClass="min-h-0"
              className="absolute inset-0 overflow-y-auto"
              action={{ href: "/money", label: "Add or view transactions" }}
            />
          )}
        </div>
      </Card>

      <div className="col-span-2 grid min-w-0 gap-2 md:col-span-6 md:gap-3 lg:col-span-12 lg:gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
        <Card className="min-w-0 p-4" ref={spendByCategoryRef}>
          <h2 className="mb-2 font-display text-lg font-medium">Spend by category</h2>
          {spendByCategoryInView ? (
            pieSpendHasData ? (
              <>
                <div className="relative h-[240px] w-full min-h-0 min-w-0">
                  <PieByCategoryChart data={pieSpendForChart} />
                </div>
                <ul className="mt-3 space-y-1 text-xs text-muted">
                  {analytics.pieSpend.slice(0, 8).map((p, i) => (
                    <li key={p.label} className="flex justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 truncate">
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{
                            backgroundColor: colorByIndex(resolved, i, style),
                          }}
                          aria-hidden
                        />
                        <span className="truncate">{p.label}</span>
                      </span>
                      <span>{formatMinor(p.valueMinor, defaultCurrency)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <AnalyticsEmptyState
                title="No category spend in this range"
                description="Add expenses or adjust filters for this range."
                minHeightClass="h-[240px] overflow-y-auto"
                action={{ href: "/money", label: "Add or view transactions" }}
              />
            )
          ) : (
            <ChartViewportFallback
              minHeight="h-[240px]"
              ariaLabel="Spend by category chart loads when this section is visible"
            />
          )}
        </Card>

        <Card className="min-w-0 p-4">
          <h2 className="mb-2 font-display text-lg font-medium">Income by category</h2>
          {pieIncomeHasData ? (
            <>
              <div className="relative h-[240px] w-full min-h-0 min-w-0">
                <PieByCategoryChart data={pieIncomeForChart} />
              </div>
              <ul className="mt-3 space-y-1 text-xs text-muted">
                {analytics.pieIncome.slice(0, 8).map((p, i) => (
                  <li key={p.label} className="flex justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{
                          backgroundColor: colorByIndex(resolved, i, style),
                        }}
                        aria-hidden
                      />
                      <span className="truncate">{p.label}</span>
                    </span>
                    <span>{formatMinor(p.valueMinor, defaultCurrency)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <AnalyticsEmptyState
              title="No category income in this range"
              description="Add income or adjust filters for this range."
              minHeightClass="h-[240px] overflow-y-auto"
              action={{ href: "/money", label: "Add or view transactions" }}
            />
          )}
        </Card>

        <Card className="min-w-0 p-4" ref={monthlyColumnsRef}>
          <h2 className="mb-2 font-display text-lg font-medium">
            Monthly expense and income
          </h2>
          {monthlyColumnsInView ? (
            columnHasFlow ? (
              <>
                <div className="relative h-[240px] w-full min-h-0 min-w-0">
                  <ColumnChart data={analytics.column} />
                </div>
                <ul className="mt-3 space-y-1 text-xs text-muted">
                  <li className="flex justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{
                          backgroundColor: chartExpenseHotPastel(style, resolved),
                        }}
                        aria-hidden
                      />
                      <span className="truncate">Expense</span>
                    </span>
                    <span>{formatMinor(columnExpenseTotal, defaultCurrency)}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{
                          backgroundColor: colorByIndex(resolved, 3, style),
                        }}
                        aria-hidden
                      />
                      <span className="truncate">Income</span>
                    </span>
                    <span>{formatMinor(columnIncomeTotal, defaultCurrency)}</span>
                  </li>
                </ul>
              </>
            ) : (
              <AnalyticsEmptyState
                title="No monthly expense or income to plot"
                description="Add transactions or widen the range to see bars."
                minHeightClass="h-[240px] overflow-y-auto"
                action={{ href: "/money", label: "Add or view transactions" }}
              />
            )
          ) : (
            <ChartViewportFallback
              minHeight="h-[240px]"
              ariaLabel="Monthly expense and income chart loads when this section is visible"
            />
          )}
        </Card>
      </div>

      {showNetFlow ? (
        <Card
          className="col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12"
          ref={netFlowRef}
        >
          <h2 className="mb-2 font-display text-lg font-medium">Net cumulative flow</h2>
        {analytics.lineCompare ? (
          <p className="mb-2 text-xs text-muted">
            Solid: this month through today. Dashed: {lineCompareLabel}.
          </p>
        ) : null}
        <div className="relative h-[240px] w-full min-h-0 min-w-0">
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
              />
            ) : (
              <AnalyticsEmptyState
                title="No cash flow in this range"
                description="Widen the range or add transactions."
                descriptionClassName="line-clamp-1"
                minHeightClass="h-[240px] overflow-y-auto"
                action={{ href: "/money", label: "Add or view transactions" }}
              />
            )
          ) : (
            <ChartViewportFallback
              minHeight="h-[240px]"
              ariaLabel="Net cumulative flow chart loads when this section is visible"
            />
          )}
        </div>
        </Card>
      ) : null}

      <AnalyticsBudgetsSection
        budgets={budgets}
        categories={categories}
        accounts={accounts}
        tags={tags}
        currency={defaultCurrency}
      />
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
            spendByCategoryInView={spendByCategoryInView}
            monthlyColumnsInView={monthlyColumnsInView}
            netFlowInView={netFlowInView}
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
