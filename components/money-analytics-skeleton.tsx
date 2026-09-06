import {
  CHART_CARD_HEIGHT_FULL,
  CHART_CARD_HEIGHT_HALF,
  CHART_CARD_HEIGHT_TALL,
  CHART_CARD_HEIGHT_FILL,
  CHART_CARD_LAYOUT,
  ANALYTICS_HERO_ROW_GRID,
  ANALYTICS_HERO_SPEND_CLASS,
  ANALYTICS_HERO_SIDE_CLASS,
} from "@/components/analytics-chart-layout";
import { MoneyFilterToolbar } from "@/components/money-page-header";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";

/** Desktop filter triggers: Ledger · Direction · Accounts · Categories · More. */
const FILTER_TRIGGER_COUNT = 5;
/** Investments / Loans Insights: Date · Apply · Reset. */
const FEATURE_INSIGHTS_FILTER_TRIGGER_COUNT = 1;
export { FILTER_TRIGGER_COUNT, FEATURE_INSIGHTS_FILTER_TRIGGER_COUNT };

export function AnalyticsPeriodChipSkeleton({
  dirty = false,
}: {
  dirty?: boolean;
} = {}) {
  return (
    <div className="space-y-1" aria-hidden>
      <Skeleton className="h-4 w-40 max-w-full rounded-[var(--radius-sm)]" />
      {dirty ? (
        <Skeleton className="h-4 w-28 rounded-[var(--radius-sm)]" />
      ) : null}
    </div>
  );
}

export function StatusStripSkeleton({ className }: { className?: string } = {}) {
  return (
    <Skeleton
      className={cn("h-4 w-56 max-w-full rounded-[var(--radius-sm)]", className)}
      aria-hidden
    />
  );
}
const TABLE_LOADING_ROWS = 6;
const MOBILE_CARD_COUNT = 4;

const LEGEND_GRID_SKELETON =
  "grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-2 md:grid-rows-1 md:[grid-template-columns:minmax(0,20%)_minmax(0,80%)] md:gap-3";

export function MoneyAnalyticsFiltersBarSkeleton({
  triggerCount = FILTER_TRIGGER_COUNT,
}: {
  triggerCount?: number;
} = {}) {
  return (
    <section className="@container" aria-hidden>
      <div className="w-full @md:hidden">
        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
      </div>

      <MoneyFilterToolbar className="mt-3 hidden @md:flex">
        {Array.from({ length: triggerCount }, (_, index) => (
          <Skeleton
            key={`analytics-filter-trigger-${index}`}
            className="mx-1 h-11 w-20 shrink-0 self-center rounded-[var(--radius-sm)]"
          />
        ))}
        <div className="ms-2 flex shrink-0 items-center gap-2 border-s border-border ps-3">
          <Skeleton className="h-9 w-16 rounded-[var(--radius-md)]" />
          <Skeleton className="h-9 w-16 rounded-[var(--radius-md)]" />
        </div>
      </MoneyFilterToolbar>
    </section>
  );
}

const ANALYTICS_INNER_GRID =
  "grid grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3";

/** Chart grid inside a Money dashboard stack (parent already full-span). */
export const ANALYTICS_GRID_CLASS = ANALYTICS_INNER_GRID;

export function AnalyticsStatsSkeleton({
  showPeriodLine = true,
}: {
  /** When false, period is shown via AnalyticsPeriodChipSkeleton elsewhere. */
  showPeriodLine?: boolean;
} = {}) {
  return (
    <div
      className="col-span-2 grid gap-3 md:col-span-6 lg:col-span-12 fx-fade-in"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading summary totals"
    >
      {showPeriodLine ? (
        <Skeleton className="h-4 w-52 max-w-full rounded-[var(--radius-sm)]" />
      ) : null}
      <div
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3"
        aria-hidden
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={`analytics-stat-${index}`} className="px-4 py-4">
            <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-2 h-8 w-32 max-w-full rounded-[var(--radius-sm)] sm:h-9" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function AnalyticsChartCardSkeleton({
  className,
  heightClass,
  titleWidthClass,
  descriptionWidthClass,
  showLegend = false,
}: {
  className?: string;
  heightClass: string;
  titleWidthClass: string;
  descriptionWidthClass: string;
  showLegend?: boolean;
}) {
  return (
    <Card className={cn("min-w-0 p-4", CHART_CARD_LAYOUT, heightClass, className)}>
      <Skeleton className={cn("mb-2 h-6 rounded-[var(--radius-sm)]", titleWidthClass)} />
      <Skeleton
        className={cn("mb-2 h-4 rounded-[var(--radius-sm)]", descriptionWidthClass)}
      />
      <div className={showLegend ? LEGEND_GRID_SKELETON : "min-h-0 flex-1"}>
        {showLegend ? (
          <Skeleton className="order-2 h-12 w-full rounded-[var(--radius-sm)] md:order-1 md:h-full md:min-h-0" />
        ) : null}
        <Skeleton
          className={cn(
            "h-full min-h-0 w-full rounded-[var(--radius-sm)]",
            showLegend && "order-1 md:order-2",
          )}
        />
      </div>
    </Card>
  );
}

/** Teaser cards that expand into deeper insights charts. */
function AnalyticsMoreInsightsTeasersSkeleton() {
  return (
    <div className="col-span-2 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3 md:col-span-6 lg:col-span-12">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={`insights-teaser-${index}`}
          className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3"
          aria-hidden
        >
          <Skeleton className="h-4 w-32 max-w-full rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-1 h-4 w-full max-w-[14rem] rounded-[var(--radius-sm)]" />
        </div>
      ))}
    </div>
  );
}

/** Default Insights body: primary chart row + teaser cards. */
function AnalyticsCollapsedGridContent() {
  return (
    <>
      <div className={ANALYTICS_HERO_ROW_GRID}>
        <AnalyticsChartCardSkeleton
          className={ANALYTICS_HERO_SPEND_CLASS}
          heightClass={cn(CHART_CARD_HEIGHT_TALL, CHART_CARD_HEIGHT_FILL)}
          titleWidthClass="w-40"
          descriptionWidthClass="w-56 max-w-full"
          showLegend
        />
        <AnalyticsChartCardSkeleton
          className={cn(ANALYTICS_HERO_SIDE_CLASS, "lg:row-start-1")}
          heightClass={CHART_CARD_HEIGHT_HALF}
          titleWidthClass="w-40"
          descriptionWidthClass="w-44"
        />
        <AnalyticsChartCardSkeleton
          className={cn(ANALYTICS_HERO_SIDE_CLASS, "lg:row-start-2")}
          heightClass={CHART_CARD_HEIGHT_HALF}
          titleWidthClass="w-48"
          descriptionWidthClass="w-72 max-w-full"
          showLegend
        />
      </div>

      <AnalyticsMoreInsightsTeasersSkeleton />
    </>
  );
}

/** Expanded Insights charts (after “More insights”). */
function AnalyticsExpandedGridContent() {
  return (
    <>
      <AnalyticsChartCardSkeleton
        className="col-span-2 w-full md:col-span-6 lg:col-span-12"
        heightClass={CHART_CARD_HEIGHT_TALL}
        titleWidthClass="w-36"
        descriptionWidthClass="w-full max-w-[42rem]"
      />

      <div className="col-span-2 grid min-w-0 grid-cols-1 gap-2 md:col-span-6 md:gap-3 lg:col-span-12 lg:grid-cols-3 lg:gap-3">
        <AnalyticsChartCardSkeleton
          heightClass={CHART_CARD_HEIGHT_HALF}
          titleWidthClass="w-36"
          descriptionWidthClass="w-40"
          showLegend
        />
        <AnalyticsChartCardSkeleton
          heightClass={CHART_CARD_HEIGHT_HALF}
          titleWidthClass="w-36"
          descriptionWidthClass="w-44"
          showLegend
        />
        <AnalyticsChartCardSkeleton
          heightClass={CHART_CARD_HEIGHT_HALF}
          titleWidthClass="w-44"
          descriptionWidthClass="w-52 max-w-full"
          showLegend
        />
        <AnalyticsChartCardSkeleton
          heightClass={CHART_CARD_HEIGHT_HALF}
          titleWidthClass="w-40"
          descriptionWidthClass="w-44"
          showLegend
        />
        <AnalyticsChartCardSkeleton
          heightClass={CHART_CARD_HEIGHT_HALF}
          titleWidthClass="w-28"
          descriptionWidthClass="w-36"
          showLegend
        />
        <AnalyticsChartCardSkeleton
          heightClass={CHART_CARD_HEIGHT_HALF}
          titleWidthClass="w-36"
          descriptionWidthClass="w-52 max-w-full"
        />
      </div>

      <AnalyticsChartCardSkeleton
        className="col-span-2 w-full md:col-span-6 lg:col-span-12"
        heightClass={CHART_CARD_HEIGHT_FULL}
        titleWidthClass="w-36"
        descriptionWidthClass="w-56 max-w-full"
      />
    </>
  );
}

export function MoneyLedgerMobileCardsSkeleton({
  selectable = false,
  count = MOBILE_CARD_COUNT,
}: {
  selectable?: boolean;
  count?: number;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={`ledger-mobile-card-${index}`}
          className="flex min-h-12 items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3"
        >
          {selectable ? (
            <Skeleton className="mt-0.5 size-4 shrink-0 rounded-[var(--radius-sm)]" />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-5 w-24 rounded-[var(--radius-sm)]" />
                <Skeleton className="mt-1 h-4 w-32 max-w-full rounded-[var(--radius-sm)]" />
              </div>
              <Skeleton className="h-4 w-16 shrink-0 rounded-[var(--radius-sm)]" />
            </div>
            <Skeleton className="mt-2 h-4 w-28 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-1 h-4 w-40 max-w-full rounded-[var(--radius-sm)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MoneyAnalyticsTransactionsTableSkeleton({
  selectable = false,
}: {
  /** Standalone ledger tables include a leading checkbox column + actions. */
  selectable?: boolean;
}) {
  const colCount = selectable ? 7 : 5;

  return (
    <section
      className="@container w-full min-w-0"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading transactions"
    >
      <Skeleton className="mb-3 h-6 w-32 rounded-[var(--radius-sm)]" />
      <Skeleton className="mb-3 h-4 w-80 max-w-full rounded-[var(--radius-sm)]" />
      <div className="hidden @md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: colCount }, (_, index) => (
                <TableHead key={`analytics-table-head-${index}`}>
                  <Skeleton className="h-4 w-full rounded-[var(--radius-sm)]" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: TABLE_LOADING_ROWS }, (_, rowIndex) => (
              <TableRow key={`analytics-table-row-${rowIndex}`}>
                {Array.from({ length: colCount }, (_, colIndex) => (
                  <TableCell
                    key={`analytics-table-row-${rowIndex}-col-${colIndex}`}
                  >
                    <Skeleton className="h-4 w-full rounded-[var(--radius-sm)]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="@md:hidden">
        <MoneyLedgerMobileCardsSkeleton selectable={selectable} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-4 w-44 rounded-[var(--radius-sm)]" />
        <div className="flex gap-2">
          <Skeleton className="h-12 w-24 rounded-[var(--radius-md)]" />
          <Skeleton className="h-12 w-16 rounded-[var(--radius-md)]" />
        </div>
      </div>
    </section>
  );
}

export function MoneyAnalyticsPageSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK)}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading analytics page"
    >
      <MoneyAnalyticsFiltersBarSkeleton />
      <AnalyticsPeriodChipSkeleton />
      <section aria-label="Summary metrics">
        <AnalyticsStatsSkeleton showPeriodLine={false} />
      </section>
      <section aria-label="Insights dashboard" className={ANALYTICS_GRID_CLASS}>
        <AnalyticsCollapsedGridContent />
      </section>
    </div>
  );
}

/** Insights with date-range filter chrome (investments / loans). */
export function FeatureInsightsPageSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK)}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading insights"
    >
      <MoneyAnalyticsFiltersBarSkeleton
        triggerCount={FEATURE_INSIGHTS_FILTER_TRIGGER_COUNT}
      />
      <AnalyticsPeriodChipSkeleton />
      <section aria-label="Summary metrics">
        <AnalyticsStatsSkeleton showPeriodLine={false} />
      </section>
      <MoneyAnalyticsChartsSkeleton />
    </div>
  );
}

/** Filters + optional stats/chart + table as shell siblings (ledger routes). */
export function MoneyLedgerPageSkeleton({
  showChart = true,
  showSummaryStats = false,
}: {
  showChart?: boolean;
  showSummaryStats?: boolean;
} = {}) {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK)}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading ledger page"
    >
      <MoneyAnalyticsFiltersBarSkeleton />
      <AnalyticsPeriodChipSkeleton />
      {showSummaryStats ? <AnalyticsStatsSkeleton showPeriodLine={false} /> : null}
      {showChart ? (
        <AnalyticsChartCardSkeleton
          className="w-full"
          heightClass={CHART_CARD_HEIGHT_TALL}
          titleWidthClass="w-44"
          descriptionWidthClass="w-64 max-w-full"
          showLegend
        />
      ) : null}
      <MoneyAnalyticsTransactionsTableSkeleton selectable />
    </div>
  );
}

/** Insights chart grid while summary/workspace resolve (collapsed default). */
export function MoneyAnalyticsChartsSkeleton({
  expanded = false,
}: {
  expanded?: boolean;
}) {
  return (
    <div
      className={ANALYTICS_INNER_GRID}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading analytics charts"
    >
      {expanded ? (
        <>
          <AnalyticsCollapsedGridContent />
          <AnalyticsExpandedGridContent />
        </>
      ) : (
        <AnalyticsCollapsedGridContent />
      )}
    </div>
  );
}
