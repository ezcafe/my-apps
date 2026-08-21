import { MoneyLedgerPageSkeleton } from "@/components/money-analytics-skeleton";

export default function MoneyTransactionsLoading() {
  return <MoneyLedgerPageSkeleton showChart={false} showSummaryStats />;
}
