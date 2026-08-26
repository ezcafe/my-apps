"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
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
  CHART_CARD_HEIGHT_TALL,
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
import { LoansInsightsStats } from "@/components/loans-insights-stats";
import { LoansRemainingByLoanCard } from "@/components/loan-chart-cards/remaining-by-loan-card";
import { LoansPaidPrincipalInterestCard } from "@/components/loan-chart-cards/paid-principal-interest-card";
import { useLoansWorkspace } from "@/components/loans-workspace-provider";
import { MONEY_DASHBOARD_STACK, MONEY_FULL_SPAN } from "@/lib/money-layout";
import { cn } from "@/lib/cn";
import { formatMinor } from "@/lib/format-money";
import { loansInsightsDefaultRange } from "@/lib/money-first-load-filters";
import {
  loansInsightsAtfQueryOptions,
  loansInsightsMoreQueryOptions,
  type LoansInsightsMore,
} from "@/lib/loans-query-options";
import { useInViewOnce } from "@/lib/use-in-view-once";
import { MoneyQueryErrorAlert } from "@/components/money-feedback";

const LoanProgressChart = dynamic(
  () =>
    import("@/components/charts/loan-progress-chart").then((m) => ({
      default: m.LoanProgressChart,
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

export function LoansInsightsDashboard() {
  const { workspaceReady, defaultCurrency } = useLoansWorkspace();
  const currency = defaultCurrency ?? "USD";
  const pageDefault = useMemo(() => loansInsightsDefaultRange(), []);
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
    const fresh = loansInsightsDefaultRange();
    setDraft(fresh);
    setApplied(fresh);
  }, []);

  const atfQuery = useQuery({
    ...loansInsightsAtfQueryOptions(applied.from, applied.to),
    enabled: workspaceReady,
  });
  const moreQuery = useQuery({
    ...loansInsightsMoreQueryOptions(applied.from, applied.to),
    enabled: moreInsights && workspaceReady,
  });

  const formatY = (minor: number) => formatMinor(minor, currency);
  const atf = atfQuery.data;
  const empty = atf != null && atf.summary.loanCount === 0;

  useSetAppHeader({
    meta: "Payoff progress, balance trends, and loan metrics for the selected range.",
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
          <LoansInsightsStats
            atf={atf}
            currency={currency}
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

      {empty ? (
        <AnalyticsEmptyState
          icon="loan"
          accentChartIndex={6}
          title="No active loans yet"
          description="Create a loan to track payments, due dates, and payoff progress in one place."
          primaryAction={{ href: "/loans/new", label: "Create your first loan" }}
        />
      ) : null}

      {atf && !empty ? (
        <section aria-label="Insights dashboard" className={ANALYTICS_GRID_CLASS}>
          <div className="col-span-2 grid min-w-0 grid-cols-1 gap-2 md:col-span-6 md:grid-cols-2 md:gap-3 lg:col-span-12">
            <LoansRemainingByLoanCard
              ready
              slices={atf.remainingByLoan}
              currency={currency}
            />
            <LoansPaidPrincipalInterestCard
              ready
              principalMinor={atf.paidPrincipalMinor}
              interestMinor={atf.paidInterestMinor}
              formatValue={formatY}
              periodFrom={atf.range.from}
              periodTo={atf.range.to}
            />
          </div>

          {!moreInsights ? (
            <div className="col-span-2 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3 md:col-span-6 lg:col-span-12">
              {(
                [
                  {
                    title: "Combined payoff progress",
                    hint: "Scheduled, paid, and projected principal across all loans",
                  },
                  {
                    title: "Collateral LTV",
                    hint: "Loan-to-value on loans with collateral",
                  },
                  {
                    title: "Per-loan payoff",
                    hint: "Progress bars for each active loan",
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
            <LoansMoreInsights
              more={moreQuery.data}
              moreReady={moreQuery.isSuccess}
              moreError={moreQuery.error}
              onRetryMore={() => void moreQuery.refetch()}
              currency={currency}
            />
          )}
        </section>
      ) : null}
    </div>
  );
}

function LoansMoreInsights({
  more,
  moreReady,
  moreError,
  onRetryMore,
  currency,
}: {
  more: LoansInsightsMore | undefined;
  moreReady: boolean;
  moreError: Error | null;
  onRetryMore: () => void;
  currency: string;
}) {
  const { ref: chartRef, isInView: chartInView } = useInViewOnce();
  const formatY = (minor: number) => formatMinor(minor, currency);

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
        ref={chartRef}
        className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_TALL}`}
      >
        <h2 className="mb-2 font-display text-lg font-medium">
          Combined payoff progress
        </h2>
        <p className="mb-2 text-xs text-muted">
          Scheduled, paid, and projected principal across all loans.
        </p>
        <AnalyticsChartContainer>
          {!chartInView || !moreReady || !more ? (
            <DeferredChartLoading ariaLabel="Loading combined payoff chart" />
          ) : more.combinedChart.length > 0 ? (
            <LoanProgressChart data={more.combinedChart} formatY={formatY} />
          ) : (
            <AnalyticsEmptyState
              title="No schedule to chart"
              description="Loans with an amortization schedule will appear here."
              minHeightClass="min-h-0"
              className={CHART_SLOT_CLASS}
              icon="loan"
              accentChartIndex={6}
            />
          )}
        </AnalyticsChartContainer>
      </Card>

      <div className="col-span-2 grid gap-3 md:col-span-6 lg:col-span-12 md:grid-cols-2">
        <Card className="px-4 py-4">
          <p className="text-sm font-medium text-muted">Interest still scheduled</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {more ? (
              <AnimatedNumber
                value={more.remainingInterestMinor}
                format={(n) => formatMinor(Math.round(n), currency)}
              />
            ) : (
              "—"
            )}
          </p>
        </Card>
        {more?.ltvPct != null ? (
          <Card className="px-4 py-4">
            <p className="flex items-center gap-1 text-sm font-medium text-muted">
              Collateral LTV
              <AboutDisclosure label="About LTV">
                Remaining balances divided by collateral on loans that have a
                collateral value.
              </AboutDisclosure>
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              {more.ltvPct.toFixed(1)}%
            </p>
          </Card>
        ) : (
          <Card className="px-4 py-4">
            <p className="text-sm font-medium text-muted">Collateral LTV</p>
            <p className="mt-2 text-sm text-muted">
              Add collateral on a loan to see loan-to-value.
            </p>
          </Card>
        )}
      </div>

      <section className="col-span-2 min-w-0 space-y-3 md:col-span-6 lg:col-span-12">
        <h2 className="font-display text-lg font-medium">Payoff progress</h2>
        {!moreReady ? (
          <DeferredChartLoading ariaLabel="Loading loan progress" />
        ) : more && more.progress.length > 0 ? (
          <ul className="space-y-3">
            {more.progress.map((loan) => (
              <li key={loan.id}>
                <Link href={`/loans/${loan.id}`} className="fx-press block">
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="font-medium">{loan.name}</span>
                    <span className="tabular-nums text-muted">
                      {loan.percentComplete.toFixed(1)}% ·{" "}
                      {formatMinor(loan.remainingMinor, currency)}
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--foreground)_10%,transparent)]"
                    role="progressbar"
                    aria-valuenow={loan.percentComplete}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${loan.name} payoff progress`}
                  >
                    <div
                      className="h-full rounded-[var(--radius-sm)] bg-accent transition-[width] duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, loan.percentComplete))}%`,
                      }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No active loans to show.</p>
        )}
      </section>
    </>
  );
}
