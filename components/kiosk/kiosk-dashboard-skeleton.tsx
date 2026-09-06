import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SHELL_DASHBOARD_STACK } from "@/lib/shell-layout";
import { cn } from "@/lib/cn";

export function KioskDashboardSkeleton() {
  return (
    <div
      className={cn(SHELL_DASHBOARD_STACK)}
      aria-busy
      aria-label="Loading kiosk"
    >
      <Card className="@container px-4 py-5">
        <div className="grid min-w-0 gap-4 @[32rem]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @[32rem]:items-center @[32rem]:gap-6">
          <div className="min-w-0">
            <Skeleton className="h-4 w-14 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-2 h-9 w-40 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-2 h-4 w-28 rounded-[var(--radius-sm)]" />
          </div>
          <div
            aria-hidden
            className="hidden h-px w-full bg-border @[32rem]:block @[32rem]:h-12 @[32rem]:w-px"
          />
          <div className="min-w-0 @[32rem]:text-end">
            <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)] @[32rem]:ms-auto" />
            <Skeleton className="mt-2 h-9 w-20 rounded-[var(--radius-sm)] @[32rem]:ms-auto" />
            <Skeleton className="mt-2 h-4 w-32 rounded-[var(--radius-sm)] @[32rem]:ms-auto" />
          </div>
        </div>
      </Card>

      <section
        aria-hidden
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4"
      >
        <Card className="px-4 py-5">
          <Skeleton className="h-4 w-10 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-3 h-11 w-40 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-2 h-4 w-28 rounded-[var(--radius-sm)]" />
          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-3 border-t border-border pt-4">
            <Skeleton className="h-14 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-14 rounded-[var(--radius-sm)]" />
          </div>
        </Card>
      </section>

      <section className="space-y-3" aria-hidden>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <Skeleton className="h-6 w-40 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
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
