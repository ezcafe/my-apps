import {
  MoneyAnalyticsFiltersBarSkeleton,
  AnalyticsStatsSkeleton,
  MoneyAnalyticsTransactionsTableSkeleton,
} from "@/components/money-analytics-skeleton";

export default function MoneyTransactionsLoading() {
  return (
    <>
      <MoneyAnalyticsFiltersBarSkeleton />
      <AnalyticsStatsSkeleton />
      <MoneyAnalyticsTransactionsTableSkeleton selectable />
    </>
  );
}
