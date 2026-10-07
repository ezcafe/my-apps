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
        <aside className="w-full md:w-52 lg:w-56 shrink-0 md:sticky md:top-6 md:self-start">
          <div className="flex md:hidden w-full overflow-x-auto pb-1 gap-1.5">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton
                key={`cat-pill-${i}`}
                className="h-7 w-24 shrink-0 rounded-[var(--radius-sm)]"
              />
            ))}
          </div>

          <div className="hidden md:flex flex-col gap-1 w-full">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton
                key={`cat-item-${i}`}
                className="h-9 w-full rounded-[var(--radius-sm)]"
              />
            ))}
          </div>
        </aside>

        <div className="flex-1 min-w-0 w-full space-y-8">
          <div className="w-full max-w-2xl">
            <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
          </div>

          {/* Appearance — single pane matches live SettingsPageLayout */}
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
        </div>
      </div>
    </div>
  );
}
