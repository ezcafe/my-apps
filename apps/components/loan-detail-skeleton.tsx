import {
  CHART_CARD_HEIGHT_TALL,
  CHART_CARD_LAYOUT,
} from "@/components/analytics-chart-layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const LOAN_DETAIL_GRID_CLASS =
  "grid w-full grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3";

const LEGEND_GRID_COMPACT_SKELETON =
  "grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-2 md:grid-rows-1 md:[grid-template-columns:minmax(0,5.5rem)_minmax(0,1fr)] md:gap-3";

function LoanDetailStatsSkeleton() {
  return (
    <div className="col-span-2 grid gap-2 md:col-span-6 lg:col-span-12">
      <Skeleton className="h-3 w-72 max-w-full rounded-[var(--radius-sm)]" />
      <div
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2"
        aria-hidden
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={`loan-stat-${index}`} className="px-4 py-5">
            <Skeleton className="h-4 w-28 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-2 h-9 w-32 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-1 h-3 w-36 rounded-[var(--radius-sm)]" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function LoanDetailNextPaymentSkeleton() {
  return (
    <Card className="col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-6 w-36 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-2 h-4 w-52 max-w-full rounded-[var(--radius-sm)]" />
        </div>
        <Skeleton className="h-8 w-28 rounded-[var(--radius-sm)]" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Skeleton className="h-10 w-36 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-40 rounded-[var(--radius-md)]" />
      </div>
    </Card>
  );
}

function LoanDetailChartSkeleton() {
  return (
    <Card
      className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_TALL}`}
    >
      <Skeleton className="mb-2 h-6 w-40 rounded-[var(--radius-sm)]" />
      <Skeleton className="mb-2 h-3 w-64 max-w-full rounded-[var(--radius-sm)]" />
      <div className={LEGEND_GRID_COMPACT_SKELETON}>
        <Skeleton className="h-full min-h-0 w-full rounded-[var(--radius-sm)]" />
        <Skeleton className="h-12 w-full rounded-[var(--radius-sm)] md:h-full md:min-h-0" />
      </div>
    </Card>
  );
}

function LoanDetailTableSkeleton() {
  return (
    <Card className="col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Skeleton className="h-6 w-40 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-2 h-3 w-56 max-w-full rounded-[var(--radius-sm)]" />
        </div>
        <div className="inline-flex gap-1 rounded-[var(--radius-sm)] border border-border p-0.5">
          <Skeleton className="h-7 w-12 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-7 w-20 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-7 w-12 rounded-[var(--radius-sm)]" />
        </div>
      </div>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
        <div className="grid grid-cols-6 gap-3 bg-muted-surface px-3 py-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton
              key={`loan-table-head-${index}`}
              className="h-4 w-full rounded-[var(--radius-sm)]"
            />
          ))}
        </div>
        <div className="divide-y divide-border px-3">
          {Array.from({ length: 6 }, (_, rowIndex) => (
            <div key={`loan-table-row-${rowIndex}`} className="grid grid-cols-6 gap-3 py-3">
              {Array.from({ length: 6 }, (_, colIndex) => (
                <Skeleton
                  key={`loan-table-row-${rowIndex}-col-${colIndex}`}
                  className="h-4 w-full rounded-[var(--radius-sm)]"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function LoanDetailPageSkeleton() {
  return (
    <>
      <header className="col-span-2 md:col-span-6 lg:col-span-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Skeleton className="mb-4 h-4 w-32 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-9 w-56 max-w-full rounded-[var(--radius-sm)] sm:h-10" />
            <Skeleton className="mt-2 h-3 w-12 rounded-[var(--radius-sm)]" />
          </div>
          <Skeleton className="size-10 shrink-0 rounded-[var(--radius-md)]" />
        </div>
      </header>
      <div className={LOAN_DETAIL_GRID_CLASS}>
        <LoanDetailStatsSkeleton />
        <LoanDetailNextPaymentSkeleton />
        <LoanDetailChartSkeleton />
        <LoanDetailTableSkeleton />
      </div>
    </>
  );
}
