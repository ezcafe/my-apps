import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/** Lightweight home shell while overview data loads. */
export function MoneyOverviewSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn(MONEY_FULL_SPAN, "space-y-8", className)}>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-36 rounded-[var(--radius-md)]" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-x-6 gap-y-3 border-b border-border pb-4">
        <div>
          <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-1 h-8 w-24 rounded-[var(--radius-sm)]" />
        </div>
        <div>
          <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-1 h-8 w-28 rounded-[var(--radius-sm)]" />
        </div>
        <div>
          <Skeleton className="h-4 w-14 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-1 h-8 w-20 rounded-[var(--radius-sm)]" />
        </div>
      </div>
      <Card className="p-4">
        <Skeleton className="mb-2 h-6 w-40 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-32 w-full rounded-[var(--radius-sm)]" />
      </Card>
      <Card className="p-4">
        <Skeleton className="mb-2 h-6 w-36 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-48 w-full rounded-[var(--radius-sm)]" />
      </Card>
    </div>
  );
}
