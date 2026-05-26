import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ANALYTICS_GRID_CLASS =
  "grid w-full grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3";

function AnalyticsStatsSkeleton() {
  return (
    <div className="col-span-2 md:col-span-6 lg:col-span-12">
      <Skeleton className="mb-2 h-3 w-40" />
      <div
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2"
        aria-hidden
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={`analytics-stat-${index}`} className="px-4 py-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-28" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function AnalyticsChartCardSkeleton({
  className,
  chartHeightClass,
  titleWidthClass,
  descriptionWidthClass,
  showLegend = false,
}: {
  className: string;
  chartHeightClass: string;
  titleWidthClass: string;
  descriptionWidthClass: string;
  showLegend?: boolean;
}) {
  return (
    <Card className={`${className} flex min-w-0 flex-col p-4`}>
      <Skeleton className={`mb-2 h-6 ${titleWidthClass}`} />
      <Skeleton className={`mb-3 h-3 ${descriptionWidthClass}`} />
      <div className={`min-h-0 flex-1 ${showLegend ? "grid grid-cols-[minmax(0,20%)_minmax(0,80%)] gap-3" : ""}`}>
        {showLegend ? <Skeleton className={`${chartHeightClass} w-full`} /> : null}
        <Skeleton className={`${chartHeightClass} w-full`} />
      </div>
    </Card>
  );
}

function AnalyticsTransactionsTableSkeleton() {
  return (
    <Card className="col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12">
      <Skeleton className="mb-3 h-6 w-32" />
      <Skeleton className="mb-4 h-3 w-80 max-w-full" />
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
        <div className="grid grid-cols-[minmax(6rem,1fr)_minmax(8rem,1.2fr)_minmax(8rem,1.2fr)_minmax(6rem,0.8fr)_minmax(10rem,1.5fr)_4rem] gap-3 bg-muted-surface px-3 py-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={`analytics-table-head-${index}`} className="h-4 w-full" />
          ))}
        </div>
        <div className="space-y-0 divide-y divide-border px-3">
          {Array.from({ length: 5 }, (_, rowIndex) => (
            <div
              key={`analytics-table-row-${rowIndex}`}
              className="grid grid-cols-[minmax(6rem,1fr)_minmax(8rem,1.2fr)_minmax(8rem,1.2fr)_minmax(6rem,0.8fr)_minmax(10rem,1.5fr)_4rem] gap-3 py-3"
            >
              {Array.from({ length: 6 }, (_, colIndex) => (
                <Skeleton
                  key={`analytics-table-row-${rowIndex}-col-${colIndex}`}
                  className="h-4 w-full"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-4 w-44" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>
    </Card>
  );
}

function AnalyticsGridContent({ includeTable }: { includeTable: boolean }) {
  return (
    <>
      <AnalyticsStatsSkeleton />

      <AnalyticsChartCardSkeleton
        className="col-span-2 w-full md:col-span-6 lg:col-span-12"
        chartHeightClass="h-[360px]"
        titleWidthClass="w-48"
        descriptionWidthClass="w-72 max-w-full"
        showLegend
      />

      <AnalyticsChartCardSkeleton
        className="col-span-2 w-full md:col-span-3 lg:col-span-6"
        chartHeightClass="h-[280px]"
        titleWidthClass="w-40"
        descriptionWidthClass="w-44"
      />

      <AnalyticsChartCardSkeleton
        className="col-span-2 w-full md:col-span-3 lg:col-span-6"
        chartHeightClass="h-[280px]"
        titleWidthClass="w-40"
        descriptionWidthClass="w-56 max-w-full"
      />

      <AnalyticsChartCardSkeleton
        className="col-span-2 w-full md:col-span-6 lg:col-span-12"
        chartHeightClass="h-[360px]"
        titleWidthClass="w-36"
        descriptionWidthClass="w-full max-w-[42rem]"
      />

      <div className="col-span-2 grid min-w-0 grid-cols-1 gap-2 md:col-span-6 md:gap-3 lg:col-span-12 lg:grid-cols-3 lg:gap-3">
        <AnalyticsChartCardSkeleton
          className="w-full"
          chartHeightClass="h-[280px]"
          titleWidthClass="w-36"
          descriptionWidthClass="w-40"
          showLegend
        />
        <AnalyticsChartCardSkeleton
          className="w-full"
          chartHeightClass="h-[280px]"
          titleWidthClass="w-36"
          descriptionWidthClass="w-44"
          showLegend
        />
        <AnalyticsChartCardSkeleton
          className="w-full"
          chartHeightClass="h-[280px]"
          titleWidthClass="w-44"
          descriptionWidthClass="w-52 max-w-full"
          showLegend
        />
        <AnalyticsChartCardSkeleton
          className="w-full"
          chartHeightClass="h-[280px]"
          titleWidthClass="w-40"
          descriptionWidthClass="w-44"
          showLegend
        />
        <AnalyticsChartCardSkeleton
          className="w-full"
          chartHeightClass="h-[280px]"
          titleWidthClass="w-28"
          descriptionWidthClass="w-36"
        />
        <AnalyticsChartCardSkeleton
          className="w-full"
          chartHeightClass="h-[280px]"
          titleWidthClass="w-32"
          descriptionWidthClass="w-40"
        />
      </div>

      <AnalyticsChartCardSkeleton
        className="col-span-2 w-full md:col-span-6 lg:col-span-12"
        chartHeightClass="h-[260px]"
        titleWidthClass="w-36"
        descriptionWidthClass="w-56 max-w-full"
      />

      {includeTable ? <AnalyticsTransactionsTableSkeleton /> : null}
    </>
  );
}

export function MoneyAnalyticsPageSkeleton() {
  return (
    <div
      className="min-w-0"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading analytics page"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 md:mb-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-full max-w-[42rem]" />
          <Skeleton className="h-4 w-full max-w-[28rem]" />
        </div>
        <Skeleton className="h-10 w-24 shrink-0" />
      </div>

      <div className={ANALYTICS_GRID_CLASS}>
        <AnalyticsGridContent includeTable />
      </div>
    </div>
  );
}

export function MoneyAnalyticsChartsSkeleton() {
  return (
    <div
      className={`col-span-2 md:col-span-6 lg:col-span-12 ${ANALYTICS_GRID_CLASS}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading analytics charts"
    >
      <AnalyticsGridContent includeTable={false} />
    </div>
  );
}
