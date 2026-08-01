import dynamic from "next/dynamic";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { MoneyOverviewSkeleton } from "@/components/money-overview-skeleton";

const MoneyTransactionFormLazy = dynamic(
  () =>
    import("@/components/money-transaction-form").then((mod) => ({
      default: mod.MoneyTransactionForm,
    })),
  { loading: () => <MoneyOverviewSkeleton variant="form" /> },
);

export default function MoneyNewPage() {
  return (
    <div className={MONEY_FULL_SPAN}>
      <MoneyTransactionFormLazy mode="transaction" />
    </div>
  );
}
