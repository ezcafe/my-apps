import { MoneyListSkeleton } from "@/components/money-feedback";
import {
  AnalyticsStatsSkeleton,
  StatusStripSkeleton,
} from "@/components/money-analytics-skeleton";
import { MONEY_DASHBOARD_STACK, MONEY_FULL_SPAN } from "@/lib/money-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

export function LoansOverviewPageSkeleton() {
  return (
    <div
      className={cn(MONEY_FULL_SPAN, MONEY_DASHBOARD_STACK)}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading loans"
    >
      <AnalyticsStatsSkeleton showPeriodLine={false} />
      <StatusStripSkeleton />
      <div className="flex flex-wrap gap-2" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton
            key={`loan-filter-${i}`}
            className="h-9 w-16 rounded-[var(--radius-sm)]"
          />
        ))}
      </div>
      <MoneyListSkeleton variant="loansTable" />
    </div>
  );
}
