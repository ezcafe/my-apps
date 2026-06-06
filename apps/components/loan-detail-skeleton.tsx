import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const LOAN_DETAIL_GRID_CLASS =
  "grid w-full grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3";

function LoanDetailStatsSkeleton() {
  return (
    <div className="col-span-2 md:col-span-6 lg:col-span-12">
      <Skeleton className="mb-2 h-3 w-72 max-w-full" />
      <div
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2"
        aria-hidden
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={`loan-stat-${index}`} className="px-4 py-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-36" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function LoanDetailChartSkeleton() {
  return (
    <Card className="col-span-2 flex min-w-0 flex-col p-4 md:col-span-6 lg:col-span-12">
      <Skeleton className="mb-2 h-6 w-40" />
      <Skeleton className="mb-3 h-3 w-64 max-w-full" />
      <Skeleton className="h-[280px] w-full" />
    </Card>
  );
}

function LoanDetailTableSkeleton() {
  return (
    <Card className="col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12">
      <Skeleton className="mb-3 h-6 w-40" />
      <Skeleton className="mb-4 h-3 w-56 max-w-full" />
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
        <div className="grid grid-cols-6 gap-3 bg-muted-surface px-3 py-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={`loan-table-head-${index}`} className="h-4 w-full" />
          ))}
        </div>
        <div className="divide-y divide-border px-3">
          {Array.from({ length: 6 }, (_, rowIndex) => (
            <div key={`loan-table-row-${rowIndex}`} className="grid grid-cols-6 gap-3 py-3">
              {Array.from({ length: 6 }, (_, colIndex) => (
                <Skeleton
                  key={`loan-table-row-${rowIndex}-col-${colIndex}`}
                  className="h-4 w-full"
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
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="h-9 w-56 max-w-full" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </header>
      <div className={LOAN_DETAIL_GRID_CLASS}>
        <LoanDetailStatsSkeleton />
        <LoanDetailChartSkeleton />
        <LoanDetailTableSkeleton />
      </div>
    </>
  );
}
