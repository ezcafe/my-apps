import { Skeleton } from "@/components/ui/skeleton";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";

export default function SettingsLoading() {
  return (
    <div
      className={`${SHELL_FULL_SPAN} space-y-6`}
      aria-busy
      aria-label="Loading settings"
    >
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-10 items-start">
        {/* Left Navigation Sidebar Skeleton */}
        <aside className="w-full md:w-52 lg:w-56 shrink-0 md:sticky md:top-6 md:self-start">
          {/* Mobile horizontal category chips skeleton (< md) */}
          <div className="flex md:hidden w-full overflow-x-auto pb-1 gap-1.5">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton
                key={`cat-pill-${i}`}
                className="h-7 w-24 shrink-0 rounded-[var(--radius-sm)]"
              />
            ))}
          </div>

          {/* Desktop vertical sidebar skeleton (md+) */}
          <div className="hidden md:flex flex-col gap-1 w-full">
            {Array.from({ length: 7 }, (_, i) => (
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

          {/* Appearance */}
          <section className="space-y-4">
            <div className="border-b border-border/70 pb-3 space-y-1.5">
              <Skeleton className="h-7 w-40 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-64 max-w-full rounded-[var(--radius-sm)]" />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Skeleton className="h-9 w-24 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-9 w-20 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-9 w-20 rounded-[var(--radius-sm)]" />
            </div>
          </section>

          {/* Date format */}
          <section className="space-y-4">
            <div className="border-b border-border/70 pb-3 space-y-1.5">
              <Skeleton className="h-7 w-36 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-72 max-w-full rounded-[var(--radius-sm)]" />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Skeleton className="h-9 w-20 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-9 w-16 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-9 w-16 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-9 w-16 rounded-[var(--radius-sm)]" />
            </div>
          </section>

          {/* Home */}
          <section className="space-y-4">
            <div className="border-b border-border/70 pb-3 space-y-1.5">
              <Skeleton className="h-7 w-24 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-64 max-w-full rounded-[var(--radius-sm)]" />
            </div>
            <Skeleton className="h-10 w-full max-w-md rounded-[var(--radius-sm)]" />
          </section>

          {/* Account */}
          <section className="space-y-4">
            <div className="border-b border-border/70 pb-3 space-y-1.5">
              <Skeleton className="h-7 w-32 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-80 max-w-full rounded-[var(--radius-sm)]" />
            </div>
            <div className="divide-y divide-border rounded-[var(--radius-sm)] bg-background">
              <div className="flex justify-between px-3 py-3">
                <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-4 w-32 rounded-[var(--radius-sm)]" />
              </div>
              <div className="flex justify-between px-3 py-3">
                <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-4 w-44 rounded-[var(--radius-sm)]" />
              </div>
            </div>
          </section>

          {/* Workspaces */}
          <section className="space-y-4">
            <div className="border-b border-border/70 pb-3 space-y-1.5">
              <Skeleton className="h-7 w-40 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-96 max-w-full rounded-[var(--radius-sm)]" />
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-background p-4 space-y-4">
              <Skeleton className="h-4 w-64 max-w-full rounded-[var(--radius-sm)]" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-sm)]" />
            </div>
          </section>

          {/* API Tokens */}
          <section className="space-y-4">
            <div className="border-b border-border/70 pb-3 space-y-1.5">
              <Skeleton className="h-7 w-36 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-80 max-w-full rounded-[var(--radius-sm)]" />
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-background p-4 space-y-4">
              <Skeleton className="h-4 w-72 max-w-full rounded-[var(--radius-sm)]" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-sm)]" />
            </div>
          </section>

          {/* Danger Zone / Reset */}
          <section className="space-y-4">
            <div className="border-b border-border/70 pb-3 space-y-1.5">
              <Skeleton className="h-7 w-52 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-96 max-w-full rounded-[var(--radius-sm)]" />
            </div>
            <div className="rounded-[var(--radius-sm)] border border-border/50 bg-destructive-muted-bg p-4 space-y-3">
              <Skeleton className="h-4 w-80 max-w-full rounded-[var(--radius-sm)]" />
              <Skeleton className="h-9 w-36 rounded-[var(--radius-sm)]" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
