import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

const IMPORT_STEP_COUNT = 4;
const IMPORT_KIND_COUNT = 8;

/** Mirrors `MoneyCsvImportWizard` type-step chrome while the chunk loads. */
export function MoneyCsvImportWizardSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(MONEY_FULL_SPAN, "min-w-0", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading import wizard"
    >
      <nav aria-hidden className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-3 w-16 rounded-[var(--radius-sm)]" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1">
          {Array.from({ length: IMPORT_STEP_COUNT }, (_, i) => (
            <Skeleton
              key={`import-step-${i}`}
              className="h-8 w-16 rounded-[var(--radius-sm)]"
            />
          ))}
        </div>
      </nav>

      <div className="mt-8">
        <Skeleton className="h-4 w-40 rounded-[var(--radius-sm)]" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full rounded-[var(--radius-sm)]" />
        <ul
          className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-px overflow-hidden rounded-[var(--radius-md)] bg-border shadow-[var(--shadow-sm)]"
          aria-hidden
        >
          {Array.from({ length: IMPORT_KIND_COUNT }, (_, i) => (
            <li
              key={`import-kind-${i}`}
              className="flex min-w-0 items-center gap-x-3 bg-surface px-4 py-5"
            >
              <Skeleton className="h-4 w-28 flex-1 rounded-[var(--radius-sm)]" />
              <Skeleton className="size-5 shrink-0 rounded-[var(--radius-sm)]" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
