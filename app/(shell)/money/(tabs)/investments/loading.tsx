import {
  MoneyAnalyticsFiltersBarSkeleton,
  MoneyAnalyticsTransactionsTableSkeleton,
} from "@/components/money-analytics-skeleton";
import { MoneyListSkeleton } from "@/components/money-feedback";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

export default function MoneyInvestmentsLoading() {
  return (
    <div className={`${MONEY_FULL_SPAN} space-y-8`}>
      <MoneyListSkeleton variant="summaryTiles" tileCount={1} className="max-w-md" />
      <MoneyListSkeleton variant="panelCards" />
      <div className="space-y-4 border-t border-border pt-8">
        <MoneyAnalyticsFiltersBarSkeleton />
        <MoneyAnalyticsTransactionsTableSkeleton selectable />
      </div>
    </div>
  );
}
