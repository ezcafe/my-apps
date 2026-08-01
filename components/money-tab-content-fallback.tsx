import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/** Placeholder while a money tab panel chunk loads (`next/dynamic`). */
export function MoneyTabContentFallback() {
  return (
    <div
      className={cn(MONEY_FULL_SPAN, "space-y-6")}
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading tab content"
    >
      <Card className="p-5">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-32 rounded-[var(--radius-sm)]" />
          <Skeleton className="size-4 shrink-0 rounded-full" />
        </div>
        <div className="mt-4 divide-y divide-border rounded-[var(--radius-sm)] bg-background">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={`settings-check-${i}`} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="size-4 shrink-0 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-28 rounded-[var(--radius-sm)]" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-44 rounded-[var(--radius-sm)]" />
          <Skeleton className="size-4 shrink-0 rounded-full" />
        </div>
        <ul
          className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-px overflow-hidden rounded-[var(--radius-sm)] bg-border"
          aria-hidden
        >
          {Array.from({ length: 6 }, (_, i) => (
            <li key={`settings-link-${i}`} className="min-w-0 bg-background px-4 py-4">
              <Skeleton className="h-4 w-36 rounded-[var(--radius-sm)]" />
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-28 rounded-[var(--radius-sm)]" />
          <Skeleton className="size-4 shrink-0 rounded-full" />
        </div>
        <Skeleton className="mt-4 h-20 w-full rounded-[var(--radius-sm)]" />
        <Skeleton className="mt-3 h-10 w-36 rounded-[var(--radius-md)]" />
      </Card>
    </div>
  );
}
