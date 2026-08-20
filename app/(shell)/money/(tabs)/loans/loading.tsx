import { MoneyListSkeleton } from "@/components/money-feedback";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function MoneyLoansLoading() {
  return (
    <div className={`${MONEY_FULL_SPAN} space-y-4`}>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
      </div>
      <MoneyListSkeleton variant="summaryTiles" showAccentBar={false} />
      <MoneyListSkeleton variant="loansTable" />
    </div>
  );
}
