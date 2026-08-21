import { MoneyListSkeleton } from "@/components/money-feedback";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

export default function MoneyLoansLoading() {
  return (
    <div className={`${MONEY_FULL_SPAN} space-y-4`}>
      <MoneyListSkeleton variant="summaryTiles" showAccentBar={false} />
      <MoneyListSkeleton variant="loansTable" />
    </div>
  );
}
