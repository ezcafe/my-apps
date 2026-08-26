"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useTransition, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { AboutDisclosure } from "@/components/ui/about-disclosure";
import { AnimatedNumber } from "@/components/ui/animated-number";
import {
  AnalyticsChartContainer,
  AnalyticsEmptyState,
  DeferredChartLoading,
} from "@/components/analytics-chart-card-shared";
import {
  CHART_CARD_HEIGHT_FULL,
  CHART_CARD_HEIGHT_HALF,
  CHART_CARD_LAYOUT,
  CHART_SLOT_CLASS,
} from "@/components/analytics-chart-layout";
import {
  ANALYTICS_GRID_CLASS,
  AnalyticsStatsSkeleton,
  FeatureInsightsPageSkeleton,
  MoneyAnalyticsChartsSkeleton,
  MoneyAnalyticsFiltersBarSkeleton,
} from "@/components/money-analytics-skeleton";
import { AnalyticsPeriodChip } from "@/components/analytics-period-chip";
import { useSetAppHeader } from "@/components/app-header-override";
import { InvestmentInsightsStats } from "@/components/investment-insights-stats";
import { InvestmentResultsOverTimeCard } from "@/components/investment-chart-cards/results-over-time-card";
import { InvestmentAllocationCard } from "@/components/investment-chart-cards/allocation-card";
import { useInvestmentWorkspace } from "@/components/investment-workspace-provider";
import { MONEY_DASHBOARD_STACK, MONEY_FULL_SPAN } from "@/lib/money-layout";
import { cn } from "@/lib/cn";
import { formatMinor } from "@/lib/format-money";
import { investmentInsightsDefaultRange } from "@/lib/money-first-load-filters";
import {
  investmentInsightsAtfQueryOptions,
  investmentInsightsMoreQueryOptions,
  type InvestmentInsightsMore,
} from "@/lib/investment-query-options";
import { useInViewOnce } from "@/lib/use-in-view-once";
import { MoneyQueryErrorAlert } from "@/components/money-feedback";

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

const InsightsDateRangeFiltersBar = dynamic(
  () =>
    import("@/components/analytics-filters").then((m) => ({
      default: m.InsightsDateRangeFiltersBar,
    })),
  {
    loading: () => <MoneyAnalyticsFiltersBarSkeleton triggerCount={1} />,
  },
);

export function InvestmentInsightsDashboard() {
  const { workspaceReady, defaultCurrency } = useInvestmentWorkspace();
  const pageDefault = useMemo(() => investmentInsightsDefaultRange(), []);
  const [draft, setDraft] = useState(pageDefault);
  const [applied, setApplied] = useState(pageDefault);
  const [isFilterPending, startFilterTransition] = useTransition();
  const [moreInsights, setMoreInsights] = useState(false);

  const dirty = draft.from !== applied.from || draft.to !== applied.to;
  const handleApply = useCallback(() => {
    startFilterTransition(() => {
      setApplied(draft);
    });
  }, [draft]);
  const handleReset = useCallback(() => {
    const fresh = investmentInsightsDefaultRange();
    setDraft(fresh);
    setApplied(fresh);
  }, []);

  const atfQuery = useQuery({
    ...investmentInsightsAtfQueryOptions(applied.from, applied.to),
    enabled: workspaceReady,
  });
  const moreQuery = useQuery({
    ...investmentInsightsMoreQueryOptions(applied.from, applied.to),
    enabled: moreInsights && workspaceReady,
  });

  const formatY = (minor: number) => formatMinor(minor, defaultCurrency);
  const atf = atfQuery.data;
  const empty =
    atf != null &&
    atf.summary.openLotsCount === 0 &&
    atf.summary.realizedPnlMinor === 0 &&
    atf.summary.resultsMinor === 0 &&
    atf.allocation.length === 0 &&
    !atf.series.some((p) => p.totalMinor !== 0);

  useSetAppHeader({
    meta: "Portfolio performance and trade results for the selected range.",
  });

  if (!workspaceReady && !atfQuery.data && !atfQuery.error) {
    return <FeatureInsightsPageSkeleton />;
  }

  return (
    <div className={cn(MONEY_FULL_SPAN, MONEY_DASHBOARD_STACK)}>
      <AnalyticsPeriodChip
        fromDate={applied.from}
        toDate={applied.to}
        dirty={dirty}
      />

      {atfQuery.isLoading && !atf ? (
        <AnalyticsStatsSkeleton showPeriodLine={false} />
      ) : null}
      {atf && !empty ? (
        <section aria-label="Summary metrics">
          <InvestmentInsightsStats
            atf={atf}
            currency={defaultCurrency}
            showPeriodCaption={false}
            variant="page"
          />
        </section>
      ) : null}

      <InsightsDateRangeFiltersBar
        value={{ fromDate: draft.from, toDate: draft.to }}
        onChange={(next) => setDraft({ from: next.fromDate, to: next.toDate })}
        onApply={handleApply}
        onReset={handleReset}
        applying={isFilterPending}
        dirty={dirty}
      />

      {atfQuery.isError ? (
        <MoneyQueryErrorAlert
          title="Couldn’t load insights"
          error={atfQuery.error}
          onRetry={() => void atfQuery.refetch()}
        />
      ) : null}

      {atfQuery.isLoading && !atf ? <MoneyAnalyticsChartsSkeleton /> : null}

      {atf && empty ? (
        <AnalyticsEmptyState
          icon="investment"
          accentChartIndex={4}
          title="No results yet"
          description="Create an instrument, then open a trade or record a closed activity."
          primaryAction={{ href: "/investments/new", label: "Record activity" }}
        />
      ) : null}

      {atf && !empty ? (
        <section aria-label="Insights dashboard" className={ANALYTICS_GRID_CLASS}>
          <div className="col-span-2 grid min-w-0 grid-cols-1 gap-2 md:col-span-6 md:grid-cols-2 md:gap-3 lg:col-span-12">
            <InvestmentResultsOverTimeCard
              ready
              series={atf.series}
              formatY={formatY}
            />
            <InvestmentAllocationCard
              ready
              slices={atf.allocation}
              currency={defaultCurrency}
            />
          </div>

          {!moreInsights ? (
            <div className="col-span-2 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3 md:col-span-6 lg:col-span-12">
              {(
                [
                  {
                    title: "Realized vs unrealized",
                    hint: "Closed P&L versus mark-to-market on open lots",
                  },
                  {
                    title: "P&L by symbol",
                    hint: "Which symbols drive your results",
                  },
                  {
                    title: "Risk metrics",
                    hint: "Max drawdown and closed-lot hit rate",
                  },
                ] as const
              ).map(({ title, hint }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => setMoreInsights(true)}
                  className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-left transition-colors duration-200 hover:bg-muted-surface fx-press"
                >
                  <span className="block text-sm font-medium text-foreground">
                    {title}
                  </span>
                  <span className="mt-1 block text-sm text-muted">{hint}</span>
                </button>
              ))}
            </div>
          ) : (
            <InvestmentMoreInsights
              more={moreQuery.data}
              moreReady={moreQuery.isSuccess}
              moreError={moreQuery.error}
              onRetryMore={() => void moreQuery.refetch()}
              currency={defaultCurrency}
            />
          )}
        </section>
      ) : null}
    </div>
  );
}

function InvestmentMoreInsights({
  more,
  moreReady,
  moreError,
  onRetryMore,
  currency,
}: {
  more: InvestmentInsightsMore | undefined;
  moreReady: boolean;
  moreError: Error | null;
  onRetryMore: () => void;
  currency: string;
}) {
  const { ref: pnlRef, isInView: pnlInView } = useInViewOnce();
  const formatY = (minor: number) => formatMinor(minor, currency);
  const hitRate =
    more && more.closedCount > 0
      ? `${Math.round((more.winningClosedCount / more.closedCount) * 100)}%`
      : "—";

  return (
    <>
      {moreError ? (
        <div className="col-span-2 md:col-span-6 lg:col-span-12">
          <MoneyQueryErrorAlert
            title="Couldn’t load extra insights"
            error={moreError}
            onRetry={onRetryMore}
          />
        </div>
      ) : null}

      <Card
        className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`}
      >
        <h2 className="mb-2 font-display text-lg font-medium">
          Realized vs unrealized
        </h2>
        <p className="mb-2 text-xs text-muted">
          Closed P&amp;L versus mark-to-market on lots still open. Bars show
          positive amounts only.
        </p>
        <AnalyticsChartContainer>
          {!moreReady || !more ? (
            <DeferredChartLoading ariaLabel="Loading realized versus unrealized" />
          ) : more.realizedMinor > 0 || more.unrealizedMinor > 0 ? (
            <DivergingBarChart
              incomeMinor={Math.max(0, more.realizedMinor)}
              expenseMinor={Math.max(0, more.unrealizedMinor)}
              formatValue={formatY}
            />
          ) : (
            <AnalyticsEmptyState
              title="No positive P&amp;L to compare"
              description="Close a winning trade or wait for quotes on open lots."
              minHeightClass="min-h-0"
              className={CHART_SLOT_CLASS}
              icon="investment"
              accentChartIndex={4}
            />
          )}
        </AnalyticsChartContainer>
      </Card>

      <Card
        ref={pnlRef}
        className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_FULL}`}
      >
        <h2 className="mb-2 font-display text-lg font-medium">P&amp;L by symbol</h2>
        <AnalyticsChartContainer>
          {!pnlInView || !moreReady || !more ? (
            <DeferredChartLoading ariaLabel="Loading P&amp;L by symbol" />
          ) : more.pnlBySymbol.length > 0 ? (
            <HorizontalBarChart
              data={more.pnlBySymbol.map((row) => ({
                key: row.symbol,
                label: `${row.symbol} ${formatY(row.valueMinor)}`,
                valueMinor: Math.abs(row.valueMinor) || 1,
              }))}
              formatValue={formatY}
            />
          ) : (
            <AnalyticsEmptyState
              title="No symbol P&amp;L yet"
              description="Closed or open marked lots will appear here."
              minHeightClass="min-h-0"
              className={CHART_SLOT_CLASS}
              icon="investment"
              accentChartIndex={4}
            />
          )}
        </AnalyticsChartContainer>
      </Card>

      <div className="col-span-2 grid gap-3 md:col-span-6 lg:col-span-12 md:grid-cols-2">
        <Card className="px-4 py-4">
          <p className="text-sm font-medium text-muted">Max drawdown</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {more ? (
              <AnimatedNumber
                value={more.maxDrawdownMinor}
                format={(n) => formatMinor(Math.round(n), currency)}
              />
            ) : (
              "—"
            )}
          </p>
        </Card>
        <Card className="px-4 py-4">
          <p className="flex items-center gap-1 text-sm font-medium text-muted">
            Hit rate
            <AboutDisclosure label="About hit rate">
              Share of closed lots with positive realized P&amp;L.
            </AboutDisclosure>
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {hitRate}
          </p>
          {more && more.closedCount > 0 ? (
            <p className="mt-1 text-sm text-muted">
              {more.winningClosedCount} of {more.closedCount} closed lots
            </p>
          ) : null}
        </Card>
      </div>
    </>
  );
}
