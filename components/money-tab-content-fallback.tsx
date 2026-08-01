import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/** Placeholder while a money tab panel chunk loads (`next/dynamic`). */
export function MoneyTabContentFallback() {
  return (
    <div
      className={cn(MONEY_FULL_SPAN, "space-y-4")}
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading tab content"
    >
      <Skeleton className="h-7 w-40 rounded-[var(--radius-sm)]" />
      <Skeleton className="mt-2 h-3 w-12 rounded-[var(--radius-sm)]" />
      <Card className="p-5">
        <Skeleton className="h-6 w-36 rounded-[var(--radius-sm)]" />
        <Skeleton className="mt-4 h-32 w-full rounded-[var(--radius-sm)]" />
        <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,8rem),1fr))]">
          <Skeleton className="h-20 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-20 rounded-[var(--radius-sm)]" />
        </div>
      </Card>
    </div>
  );
}
