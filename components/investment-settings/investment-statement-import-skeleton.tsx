import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";
import { MoneyQuickPickGroupSkeleton } from "@/components/money-dashboard-skeleton";

const PLATFORM_COUNT = 3;
const IMPORT_STEP_WIDTHS = ["w-16", "w-16", "w-24", "w-12"] as const;

/** Mirrors `InvestmentStatementImportWizard` initial step chrome for zero CLS. */
export function InvestmentStatementImportSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, "min-w-0", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading statement import wizard"
    >
      <nav aria-hidden className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-64 max-w-full rounded-[var(--radius-sm)]" />
        <MoneyQuickPickGroupSkeleton widths={[...IMPORT_STEP_WIDTHS]} />
      </nav>

      <div className="mt-8">
        <Skeleton className="h-4 w-44 rounded-[var(--radius-sm)]" />
        <Skeleton className="mt-1 h-4 w-80 max-w-full rounded-[var(--radius-sm)]" />
        <ul
          className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-px overflow-hidden rounded-[var(--radius-md)] bg-border shadow-[var(--shadow-sm)]"
          aria-hidden
        >
          {Array.from({ length: PLATFORM_COUNT }, (_, i) => (
            <li
              key={`import-platform-${i}`}
              className="flex min-w-0 flex-col gap-2 bg-surface px-4 py-5"
            >
              <div className="flex w-full items-center justify-between">
                <Skeleton className="h-4 w-24 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-4 w-14 rounded-[var(--radius-sm)]" />
              </div>
              <Skeleton className="h-3 w-48 max-w-full rounded-[var(--radius-sm)]" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
