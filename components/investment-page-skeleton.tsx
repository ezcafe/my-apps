import { MoneyListSkeleton } from "@/components/money-feedback";
import { MONEY_DASHBOARD_STACK, MONEY_FULL_SPAN } from "@/lib/money-layout";
import { cn } from "@/lib/cn";

export function MoneyInvestmentsPageSkeleton() {
  return (
    <div className={cn(MONEY_FULL_SPAN, MONEY_DASHBOARD_STACK)}>
      <MoneyListSkeleton
        variant="summaryTiles"
        tileCount={1}
        showAccentBar={false}
      />
      <MoneyListSkeleton variant="panelCards" />
      <MoneyListSkeleton variant="tableRows" />
    </div>
  );
}
