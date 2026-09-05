import { Skeleton } from "@/components/ui/skeleton";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { cn } from "@/lib/cn";

export default function LoanEditLoading() {
  return (
    <div className={cn(MONEY_FULL_SPAN, "space-y-5")}>
      <Skeleton className="h-10 w-full max-w-xl rounded-[var(--radius-sm)]" />
      <div className="grid gap-2">
        <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-24 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-28 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-24 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        </div>
      </div>
      <div className="rounded-[var(--radius-sm)] bg-muted-surface/40 p-4">
        <Skeleton className="h-4 w-48 rounded-[var(--radius-sm)]" />
        <div className="mt-3 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
          <Skeleton className="h-12 w-full rounded-[var(--radius-sm)]" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-sm)]" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-sm)]" />
        </div>
      </div>
      <Skeleton className="h-12 w-36 rounded-[var(--radius-md)]" />
    </div>
  );
}
