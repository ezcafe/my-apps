import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

export default function HelpLoading() {
  return (
    <div className={`${MONEY_FULL_SPAN} space-y-6`} aria-busy aria-label="Loading API help">
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={`help-card-${i}`} className="p-4">
            <Skeleton className="h-5 w-28 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-2 h-4 w-full rounded-[var(--radius-sm)]" />
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <Skeleton className="h-6 w-40 rounded-[var(--radius-sm)]" />
        <Skeleton className="mt-3 h-4 w-full rounded-[var(--radius-sm)]" />
        <Skeleton className="mt-2 h-4 w-5/6 max-w-full rounded-[var(--radius-sm)]" />
      </Card>
    </div>
  );
}
