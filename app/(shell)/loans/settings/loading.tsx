import { Skeleton } from "@/components/ui/skeleton";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";

export default function LoansSettingsLoading() {
  return (
    <div
      className={`${SHELL_FULL_SPAN} space-y-6`}
      aria-busy
      aria-label="Loading loans settings"
    >
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-10 items-start">
        {/* Left Navigation Sidebar Skeleton */}
        <aside className="w-full md:w-52 lg:w-56 shrink-0 md:sticky md:top-6 md:self-start">
          {/* Mobile horizontal category chips skeleton (< md) */}
          <div className="flex md:hidden w-full overflow-x-auto pb-1 gap-1.5">
            <Skeleton className="h-7 w-36 shrink-0 rounded-[var(--radius-sm)]" />
          </div>

          {/* Desktop vertical sidebar skeleton (md+) */}
          <div className="hidden md:flex flex-col gap-1 w-full">
            <Skeleton className="h-9 w-full rounded-[var(--radius-sm)]" />
          </div>
        </aside>

        {/* Center/Main content area skeleton */}
        <div className="flex-1 min-w-0 w-full space-y-8">
          {/* Search bar skeleton aligned with center content column */}
          <div className="w-full max-w-2xl">
            <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
          </div>

          {/* Payment reminders Section */}
          <section className="space-y-4">
            <div className="border-b border-border/70 pb-3 space-y-1.5">
              <Skeleton className="h-7 w-48 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-96 max-w-full rounded-[var(--radius-sm)]" />
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-background p-5 space-y-4">
              <Skeleton className="h-4 w-32 rounded-[var(--radius-sm)]" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-9 w-48 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-9 w-36 rounded-[var(--radius-sm)]" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
