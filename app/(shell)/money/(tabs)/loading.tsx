import { MoneyLedgerPageSkeleton } from "@/components/money-analytics-skeleton";

/** Money home resolves to Spending; match that layout while the tab segment loads. */
export default function MoneyTabsLoading() {
  return <MoneyLedgerPageSkeleton showChart={false} showSummaryStats />;
}
