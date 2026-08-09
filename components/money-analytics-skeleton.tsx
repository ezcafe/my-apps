import {
  CHART_CARD_HEIGHT_FULL,
  CHART_CARD_HEIGHT_HALF,
  CHART_CARD_HEIGHT_TALL,
  CHART_CARD_LAYOUT,
} from "@/components/analytics-chart-layout";
import { MoneyFilterToolbar } from "@/components/money-page-header";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/** Desktop filter triggers: Ledger · Direction · Accounts · Categories · More. */
const FILTER_TRIGGER_COUNT = 5;

const LEGEND_GRID_SKELETON =
  "grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-2 md:grid-rows-1 md:[grid-template-columns:minmax(0,20%)_minmax(0,80%)] md:gap-3";

export function MoneyAnalyticsFiltersBarSkeleton() {
  return (
    <section className={cn(MONEY_FULL_SPAN, "@container mb-4")} aria-hidden>
      <div className="flex justify-end @md:hidden">
        <Skeleton className="h-10 w-24 shrink-0 rounded-[var(--radius-md)]" />
      </div>

      <MoneyFilterToolbar className="mt-3 hidden @md:flex">
        {Array.from({ length: FILTER_TRIGGER_COUNT }, (_, index) => (
          <Skeleton
            key={`analytics-filter-trigger-${index}`}
            className="mx-1 h-5 w-20 shrink-0 self-center rounded-[var(--radius-sm)]"
          />
        ))}
        <div className="ms-2 flex shrink-0 items-center gap-2 border-s border-border ps-3">
          <Skeleton className="h-8 w-16 rounded-[var(--radius-md)]" />
          <Skeleton className="h-8 w-16 rounded-[var(--radius-md)]" />
        </div>
      </MoneyFilterToolbar>
    </section>
  );
}

const ANALYTICS_INNER_GRID =
  "grid grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3";

/** Full-width shell cell that hosts the Insights chart grid. */
export const ANALYTICS_GRID_CLASS = cn(MONEY_FULL_SPAN, ANALYTICS_INNER_GRID);

export function AnalyticsStatsSkeleton() {
  return (
    <div
      className="col-span-2 grid gap-2 border-b border-border pb-4 md:col-span-6 lg:col-span-12"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading summary totals"
    >
      <Skeleton className="h-3 w-52 max-w-full rounded-[var(--radius-sm)]" />
      <div
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-x-6 gap-y-3"
        aria-hidden
      >
        {Array.from({ length: 4 }, (_, index) => (
          <div key={`analytics-stat-${index}`}>
            <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-1 h-8 w-32 max-w-full rounded-[var(--radius-sm)]" />
          </div>
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
        className={cn("mb-2 h-3 rounded-[var(--radius-sm)]", descriptionWidthClass)}
      />
      <div className={showLegend ? LEGEND_GRID_SKELETON : "min-h-0 flex-1"}>
        <Skeleton className="h-full min-h-0 w-full rounded-[var(--radius-sm)]" />
        {showLegend ? (
          <Skeleton className="h-12 w-full rounded-[var(--radius-sm)] md:h-full md:min-h-0" />
        ) : null}
      </div>
    </Card>
  );
}

/** Default Insights body: stats + income/expense pair + “More insights”. */
function AnalyticsCollapsedGridContent() {
  return (
    <>
      <AnalyticsStatsSkeleton />

      <div className="col-span-2 grid min-w-0 grid-cols-1 gap-2 md:col-span-6 md:grid-cols-2 md:gap-3 lg:col-span-12">
        <AnalyticsChartCardSkeleton
          heightClass={CHART_CARD_HEIGHT_HALF}
          titleWidthClass="w-40"
          descriptionWidthClass="w-44"
        />
        <AnalyticsChartCardSkeleton
          heightClass={CHART_CARD_HEIGHT_HALF}
          titleWidthClass="w-40"
          descriptionWidthClass="w-56 max-w-full"
          showLegend
        />
      </div>

      <div className="col-span-2 flex flex-wrap justify-end gap-3 md:col-span-6 lg:col-span-12">
        <Skeleton className="h-8 w-28 rounded-[var(--radius-md)]" />
      </div>
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
        titleWidthClass="w-48"
        descriptionWidthClass="w-72 max-w-full"
        showLegend
      />

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

export function MoneyAnalyticsTransactionsTableSkeleton({
  selectable = false,
}: {
  /** Standalone ledger tables include a leading checkbox column. */
  selectable?: boolean;
}) {
  const colCount = selectable ? 7 : 6;

  return (
    <Card
      className={cn(
        MONEY_FULL_SPAN,
        "w-full min-w-0 p-4",
        "col-span-2 md:col-span-6 lg:col-span-12",
      )}
    >
      <Skeleton className="mb-3 h-6 w-32 rounded-[var(--radius-sm)]" />
      <Skeleton className="mb-3 h-3 w-80 max-w-full rounded-[var(--radius-sm)]" />
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
        <div
          className="grid gap-3 bg-muted-surface px-3 py-2"
          style={{
            gridTemplateColumns: selectable
              ? "2.5rem repeat(5, minmax(0, 1fr)) 4rem"
              : "repeat(5, minmax(0, 1fr)) 4rem",
          }}
        >
          {Array.from({ length: colCount }, (_, index) => (
            <Skeleton
              key={`analytics-table-head-${index}`}
              className="h-4 w-full rounded-[var(--radius-sm)]"
            />
          ))}
        </div>
        <div className="space-y-0 divide-y divide-border px-3">
          {Array.from({ length: 5 }, (_, rowIndex) => (
            <div
              key={`analytics-table-row-${rowIndex}`}
              className="grid gap-3 py-3"
              style={{
                gridTemplateColumns: selectable
                  ? "2.5rem repeat(5, minmax(0, 1fr)) 4rem"
                  : "repeat(5, minmax(0, 1fr)) 4rem",
              }}
            >
              {Array.from({ length: colCount }, (_, colIndex) => (
                <Skeleton
                  key={`analytics-table-row-${rowIndex}-col-${colIndex}`}
                  className="h-4 w-full rounded-[var(--radius-sm)]"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-4 w-44 rounded-[var(--radius-sm)]" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-[var(--radius-md)]" />
          <Skeleton className="h-9 w-16 rounded-[var(--radius-md)]" />
        </div>
      </div>
    </Card>
  );
}

export function MoneyAnalyticsPageSkeleton() {
  return (
    <>
      <MoneyAnalyticsFiltersBarSkeleton />
      <div
        className={ANALYTICS_GRID_CLASS}
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label="Loading analytics page"
      >
        <AnalyticsCollapsedGridContent />
      </div>
    </>
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
    <>
      <MoneyAnalyticsFiltersBarSkeleton />
      {showSummaryStats ? <AnalyticsStatsSkeleton /> : null}
      {showChart ? (
        <AnalyticsChartCardSkeleton
          className={cn(MONEY_FULL_SPAN, "w-full")}
          heightClass={CHART_CARD_HEIGHT_TALL}
          titleWidthClass="w-44"
          descriptionWidthClass="w-64 max-w-full"
          showLegend
        />
      ) : null}
      <MoneyAnalyticsTransactionsTableSkeleton selectable />
    </>
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
      className={cn(MONEY_FULL_SPAN, ANALYTICS_INNER_GRID)}
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
