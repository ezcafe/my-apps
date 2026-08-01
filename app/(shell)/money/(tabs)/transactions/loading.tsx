import {
  MoneyAnalyticsFiltersBarSkeleton,
  MoneyAnalyticsTransactionsTableSkeleton,
} from "@/components/money-analytics-skeleton";

export default function MoneyTransactionsLoading() {
  return (
    <>
      <MoneyAnalyticsFiltersBarSkeleton />
      <MoneyAnalyticsTransactionsTableSkeleton selectable />
    </>
  );
}
