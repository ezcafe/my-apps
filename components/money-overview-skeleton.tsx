import { MONEY_DASHBOARD_STACK, MONEY_FULL_SPAN } from "@/lib/money-layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/** Lightweight dashboard shell while overview data loads. */
export function MoneyOverviewSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(MONEY_FULL_SPAN, MONEY_DASHBOARD_STACK, className)}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading overview"
    >
      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={`overview-stat-${index}`} className="px-4 py-4">
            <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-2 h-8 w-28 max-w-full rounded-[var(--radius-sm)] sm:h-9" />
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <Skeleton className="mb-2 h-6 w-40 rounded-[var(--radius-sm)]" />
        <Skeleton className="mb-2 h-4 w-56 max-w-full rounded-[var(--radius-sm)]" />
        <Skeleton className="h-56 w-full rounded-[var(--radius-sm)]" />
      </Card>
      <section className="w-full min-w-0">
        <Skeleton className="mb-3 h-6 w-32 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-48 w-full rounded-[var(--radius-sm)]" />
      </section>
    </div>
  );
}
