import {
  MoneyAnalyticsFiltersBarSkeleton,
  MoneyAnalyticsTransactionsTableSkeleton,
} from "@/components/money-analytics-skeleton";

export default function MoneyTransactionsLoading() {
  return (
    <>
      <MoneyAnalyticsFiltersBarSkeleton />
      <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3">
        <div className="col-span-2 md:col-span-6 lg:col-span-12">
          <MoneyAnalyticsTransactionsTableSkeleton />
        </div>
      </div>
    </>
  );
}
