import { Skeleton } from "@/components/ui/skeleton";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

export default function InvestmentSettingsLoading() {
  return (
    <div
      className={`${MONEY_FULL_SPAN} space-y-6`}
      aria-busy
      aria-label="Loading investment settings"
    >
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-10 items-start">
        {/* Left Navigation Sidebar Skeleton */}
        <aside className="w-full md:w-52 lg:w-56 shrink-0 md:sticky md:top-6 md:self-start">
          {/* Mobile horizontal category chips skeleton (< md) */}
          <div className="flex md:hidden w-full overflow-x-auto pb-1 gap-1.5">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton
                key={`cat-pill-${i}`}
                className="h-7 w-28 shrink-0 rounded-[var(--radius-sm)]"
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

          {/* Statement Import Section */}
          <section className="space-y-4">
            <div className="border-b border-border/70 pb-3 space-y-1.5">
              <Skeleton className="h-7 w-44 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-80 max-w-full rounded-[var(--radius-sm)]" />
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-background p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-56 rounded-[var(--radius-sm)]" />
                  <Skeleton className="h-4 w-72 max-w-full rounded-[var(--radius-sm)]" />
                </div>
                <Skeleton className="h-9 w-36 rounded-[var(--radius-sm)]" />
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton className="h-20 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-20 rounded-[var(--radius-sm)]" />
              </div>
            </div>
          </section>

          {/* Instruments Section */}
          <section className="space-y-4">
            <div className="border-b border-border/70 pb-3 space-y-1.5">
              <Skeleton className="h-7 w-52 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-96 max-w-full rounded-[var(--radius-sm)]" />
            </div>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[var(--radius-sm)] bg-border sm:grid-cols-2">
              <Skeleton className="h-16 rounded-none bg-background" />
              <Skeleton className="h-16 rounded-none bg-background" />
            </div>
          </section>

          {/* Cash & Ledger Accounts Section */}
          <section className="space-y-4">
            <div className="border-b border-border/70 pb-3 space-y-1.5">
              <Skeleton className="h-7 w-48 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-80 max-w-full rounded-[var(--radius-sm)]" />
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-background p-5">
              <div className="space-y-4">
                <Skeleton className="h-8 w-32 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-20 w-full rounded-[var(--radius-sm)]" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
