import dynamic from "next/dynamic";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { MoneyDashboardSkeleton } from "@/components/money-dashboard-skeleton";

const MoneyTransactionFormLazy = dynamic(
  () =>
    import("@/components/money-transaction-form").then((mod) => ({
      default: mod.MoneyTransactionForm,
    })),
  { loading: () => <MoneyDashboardSkeleton /> },
);

export default function MoneyNewPage() {
  return (
    <div className={MONEY_FULL_SPAN}>
      <MoneyTransactionFormLazy mode="transaction" />
    </div>
  );
}
