import { Skeleton } from "@/components/ui/skeleton";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

export function InvestmentStatementImportSkeleton() {
  return (
    <div className={`${MONEY_FULL_SPAN} space-y-6`}>
      {/* Steps indicator */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-4">
        <Skeleton className="h-4 w-24 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-4 w-24 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-4 w-24 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-4 w-24 rounded-[var(--radius-sm)]" />
      </div>

      {/* Main card */}
      <div className="rounded-[var(--radius-md)] border border-border bg-background p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-4 w-96 max-w-full rounded-[var(--radius-sm)]" />
        </div>

        {/* Upload dropzone placeholder */}
        <div className="flex h-48 w-full flex-col items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-border bg-muted/10 p-6">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="mt-4 h-4 w-40 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-2 h-3 w-56 rounded-[var(--radius-sm)]" />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Skeleton className="h-9 w-24 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-9 w-32 rounded-[var(--radius-sm)]" />
        </div>
      </div>
    </div>
  );
}
