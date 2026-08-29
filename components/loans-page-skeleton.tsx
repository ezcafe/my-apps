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
      <MoneyListSkeleton variant="loansTable" />
    </div>
  );
}
