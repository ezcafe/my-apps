import {
  CHART_CARD_HEIGHT_TALL,
  CHART_CARD_LAYOUT,
} from "@/components/analytics-chart-layout";
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
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { cn } from "@/lib/cn";
import { MoneyQuickPickGroupSkeleton } from "@/components/money-dashboard-skeleton";

const LOAN_DETAIL_GRID_CLASS = cn(
  MONEY_FULL_SPAN,
  "grid w-full grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3",
);

const LEGEND_GRID_COMPACT_SKELETON =
  "grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-2 md:grid-rows-1 md:[grid-template-columns:minmax(0,5.5rem)_minmax(0,1fr)] md:gap-3";

function LoanDetailStatsSkeleton() {
  return (
    <div className="col-span-2 grid gap-3 md:col-span-6 lg:col-span-12 fx-fade-in">
      <Skeleton className="h-4 w-72 max-w-full rounded-[var(--radius-sm)]" />
      <div
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3"
        aria-hidden
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={`loan-stat-${index}`} className="px-4 py-4">
            <Skeleton className="h-4 w-28 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-2 h-8 w-32 max-w-full rounded-[var(--radius-sm)] sm:h-9" />
            <Skeleton className="mt-1 h-4 w-36 rounded-[var(--radius-sm)]" />
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
        <Skeleton className="h-8 w-28 rounded-[var(--radius-sm)] sm:h-9" />
      </div>
      <div className="mt-4">
        <Skeleton className="h-12 w-64 max-w-full rounded-[var(--radius-md)]" />
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
      <Skeleton className="mb-2 h-4 w-64 max-w-full rounded-[var(--radius-sm)]" />
      <div className={LEGEND_GRID_COMPACT_SKELETON}>
        <Skeleton className="order-2 h-12 w-full rounded-[var(--radius-sm)] md:order-1 md:h-full md:min-h-0" />
        <Skeleton className="order-1 h-full min-h-0 w-full rounded-[var(--radius-sm)] md:order-2" />
      </div>
    </Card>
  );
}

function LoanDetailTableSkeleton() {
  return (
    <section className="@container col-span-2 w-full min-w-0 md:col-span-6 lg:col-span-12">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Skeleton className="h-6 w-40 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-2 h-4 w-56 max-w-full rounded-[var(--radius-sm)]" />
        </div>
        <MoneyQuickPickGroupSkeleton widths={["w-12", "w-20", "w-12"]} />
      </div>
      <div className="hidden @md:block">
        <Table maxHeight="min(28rem, 60dvh)">
          <TableHeader>
            <TableRow>
              {Array.from({ length: 7 }, (_, index) => (
                <TableHead key={`loan-table-head-${index}`}>
                  <Skeleton className="h-4 w-full rounded-[var(--radius-sm)]" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }, (_, rowIndex) => (
              <TableRow key={`loan-table-row-${rowIndex}`}>
                {Array.from({ length: 7 }, (_, colIndex) => (
                  <TableCell
                    key={`loan-table-row-${rowIndex}-col-${colIndex}`}
                  >
                    <Skeleton className="h-4 w-full rounded-[var(--radius-sm)]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-2 @md:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={`loan-mobile-card-${index}`}
            className="flex min-h-12 items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-5 w-24 rounded-[var(--radius-sm)]" />
                  <Skeleton className="mt-1 h-4 w-12 rounded-[var(--radius-sm)]" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0 rounded-[var(--radius-sm)]" />
              </div>
              <Skeleton className="mt-2 h-5 w-16 rounded-[var(--radius-sm)]" />
              <Skeleton className="mt-2 h-4 w-48 max-w-full rounded-[var(--radius-sm)]" />
              <Skeleton className="mt-1 h-4 w-40 max-w-full rounded-[var(--radius-sm)]" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LoanDetailPageSkeleton() {
  return (
    <div
      className={LOAN_DETAIL_GRID_CLASS}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading loan"
    >
      <LoanDetailStatsSkeleton />
      <LoanDetailNextPaymentSkeleton />
      <LoanDetailChartSkeleton />
      <LoanDetailTableSkeleton />
    </div>
  );
}
