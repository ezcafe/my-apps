import {
  MoneyAnalyticsFiltersBarSkeleton,
  MoneyAnalyticsTransactionsTableSkeleton,
} from "@/components/money-analytics-skeleton";
import { MoneyListSkeleton } from "@/components/money-feedback";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function MoneyLoansLoading() {
  return (
    <div className={`${MONEY_FULL_SPAN} space-y-8`}>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
      </div>
      <MoneyListSkeleton variant="summaryTiles" />
      <MoneyListSkeleton variant="loansTable" />
      <div className="space-y-4 border-t border-border pt-8">
        <MoneyAnalyticsFiltersBarSkeleton />
        <MoneyAnalyticsTransactionsTableSkeleton selectable />
      </div>
    </div>
  );
}
