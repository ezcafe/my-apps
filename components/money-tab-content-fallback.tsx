import { Skeleton } from "@/components/ui/skeleton";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { cn } from "@/lib/cn";

/** Placeholder while a money tab panel chunk loads (`next/dynamic`). */
export function MoneyTabContentFallback() {
  return (
    <div
      className={cn(MONEY_FULL_SPAN, "space-y-6")}
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading settings content"
    >
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-10 items-start">
        {/* Left Navigation Sidebar Skeleton */}
        <aside className="w-full md:w-52 lg:w-56 shrink-0 md:sticky md:top-6 md:self-start">
          {/* Mobile horizontal category chips skeleton (< md) */}
          <div className="flex md:hidden w-full overflow-x-auto pb-1 gap-1.5">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton
                key={`cat-pill-${i}`}
                className="h-7 w-32 shrink-0 rounded-[var(--radius-sm)]"
              />
            ))}
          </div>

          {/* Desktop vertical sidebar skeleton (md+) */}
          <div className="hidden md:flex flex-col gap-1 w-full">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton
                key={`cat-item-${i}`}
                className="h-9 w-full rounded-[var(--radius-sm)]"
              />
            ))}
          </div>
        </aside>

        {/* Center/Main content area skeleton */}
        <div className="flex-1 min-w-0 w-full space-y-8">
          {/* Search bar skeleton aligned with center content column */}
          <div className="w-full max-w-2xl">
            <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
          </div>

          {/* Accounts & categories */}
          <section className="space-y-4">
            <div className="border-b border-border/70 pb-3 space-y-1.5">
              <Skeleton className="h-7 w-52 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-96 max-w-full rounded-[var(--radius-sm)]" />
            </div>
            <ul
              className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-px overflow-hidden rounded-[var(--radius-sm)] bg-border"
              aria-hidden
            >
              {Array.from({ length: 7 }, (_, i) => (
                <li
                  key={`settings-link-${i}`}
                  className="flex min-w-0 items-center gap-x-3 bg-background px-4 py-4"
                >
                  <Skeleton className="h-4 w-28 flex-1 rounded-[var(--radius-sm)]" />
                  <Skeleton className="size-5 shrink-0 rounded-[var(--radius-sm)]" />
                </li>
              ))}
            </ul>
          </section>

          {/* Show in menu */}
          <section className="space-y-4">
            <div className="border-b border-border/70 pb-3 space-y-1.5">
              <Skeleton className="h-7 w-40 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-80 max-w-full rounded-[var(--radius-sm)]" />
            </div>
            <div className="divide-y divide-border rounded-[var(--radius-sm)] bg-background">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={`settings-check-${i}`} className="flex items-center gap-3 px-3 py-2.5">
                  <Skeleton className="size-4 shrink-0 rounded-[var(--radius-sm)]" />
                  <Skeleton className="h-4 w-28 rounded-[var(--radius-sm)]" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
