import {
  MoneyAnalyticsFiltersBarSkeleton,
  MoneyAnalyticsTransactionsTableSkeleton,
} from "@/components/money-analytics-skeleton";
import { MoneyListSkeleton } from "@/components/money-feedback";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function MoneyInvestmentsLoading() {
  return (
    <div className={`${MONEY_FULL_SPAN} space-y-8`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-7 w-36 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-10 w-36 rounded-[var(--radius-md)]" />
      </div>
      <MoneyListSkeleton variant="summaryTiles" className="max-w-md" />
      <MoneyListSkeleton variant="panelCards" />
      <div className="space-y-4 border-t border-border pt-8">
        <MoneyAnalyticsFiltersBarSkeleton />
        <MoneyAnalyticsTransactionsTableSkeleton />
      </div>
    </div>
  );
}
