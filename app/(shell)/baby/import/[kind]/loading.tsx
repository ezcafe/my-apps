import { Skeleton } from "@/components/ui/skeleton";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";

export default function BabyImportKindLoading() {
  return (
    <div
      className={`${SHELL_FULL_SPAN} space-y-6`}
      aria-busy
      aria-label="Loading Baby import"
    >
      <div className="space-y-2">
        <Skeleton className="h-4 w-40 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-7 w-56 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-4 w-full max-w-xl rounded-[var(--radius-sm)]" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-9 w-24 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-9 w-24 rounded-[var(--radius-sm)]" />
        </div>
      </div>
      <div className="space-y-4 rounded-[var(--radius-md)] border border-border bg-surface p-5">
        <Skeleton className="h-4 w-28 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-10 w-full max-w-md rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}
