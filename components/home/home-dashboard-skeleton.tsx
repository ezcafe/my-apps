import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MONEY_DASHBOARD_STACK, MONEY_FULL_SPAN } from "@/lib/money-layout";
import { cn } from "@/lib/cn";

export function HomeDashboardSkeleton() {
  return (
    <div
      className={cn(MONEY_FULL_SPAN, MONEY_DASHBOARD_STACK)}
      aria-busy
      aria-label="Loading home"
    >
      <Card className="px-4 py-4">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-6">
          <div>
            <Skeleton className="h-4 w-14 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-2 h-8 w-36 rounded-[var(--radius-sm)] sm:h-9" />
            <Skeleton className="mt-2 h-4 w-28 rounded-[var(--radius-sm)]" />
          </div>
          <div className="sm:text-end">
            <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)] sm:ms-auto" />
            <Skeleton className="mt-2 h-8 w-20 rounded-[var(--radius-sm)] sm:ms-auto sm:h-9" />
            <Skeleton className="mt-2 h-4 w-32 rounded-[var(--radius-sm)] sm:ms-auto" />
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-4 w-64 max-w-full rounded-[var(--radius-sm)]" />
        </div>
        <Card className="px-4 py-5">
          <Skeleton className="h-4 w-10 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-3 h-10 w-40 rounded-[var(--radius-sm)] sm:h-11" />
          <Skeleton className="mt-2 h-4 w-56 max-w-full rounded-[var(--radius-sm)]" />
          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-3 border-t border-border pt-4">
            <Skeleton className="h-14 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-14 rounded-[var(--radius-sm)]" />
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-36 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-4 w-72 max-w-full rounded-[var(--radius-sm)]" />
        </div>
        <div className="divide-y divide-border rounded-[var(--radius-sm)] bg-background">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={`loan-row-${i}`} className="space-y-2 px-3 py-3">
              <Skeleton className="h-4 w-40 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-56 max-w-full rounded-[var(--radius-sm)]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
