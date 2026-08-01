import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { cn } from "@/lib/cn";

/** Lightweight home shell while overview data loads. */
export function MoneyOverviewSkeleton({
  variant = "overview",
  className,
}: {
  variant?: "overview" | "form";
  className?: string;
}) {
  if (variant === "form") {
    return (
      <div
        className={cn(
          "space-y-4 rounded-[var(--radius-md)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]",
          className,
        )}
      >
        <div className="h-6 w-40 animate-pulse rounded-[var(--radius-sm)] bg-muted-surface" />
        <div className="h-10 w-full animate-pulse rounded-[var(--radius-sm)] bg-muted-surface" />
        <div className="h-10 w-full animate-pulse rounded-[var(--radius-sm)] bg-muted-surface" />
        <div className="h-10 w-2/3 animate-pulse rounded-[var(--radius-sm)] bg-muted-surface" />
        <div className="h-10 w-32 animate-pulse rounded-[var(--radius-sm)] bg-muted-surface" />
      </div>
    );
  }

  return (
    <div className={cn(MONEY_FULL_SPAN, "space-y-8", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-8 w-28 animate-pulse rounded-[var(--radius-sm)] bg-muted-surface" />
          <div className="h-4 w-56 animate-pulse rounded-[var(--radius-sm)] bg-muted-surface" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded-[var(--radius-sm)] bg-muted-surface" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-4 border-b border-border pb-4">
        <div className="h-14 animate-pulse rounded-[var(--radius-sm)] bg-muted-surface" />
        <div className="h-14 animate-pulse rounded-[var(--radius-sm)] bg-muted-surface" />
        <div className="h-14 animate-pulse rounded-[var(--radius-sm)] bg-muted-surface" />
      </div>
      <div className="h-32 animate-pulse rounded-[var(--radius-sm)] bg-muted-surface" />
      <div className="h-48 animate-pulse rounded-[var(--radius-sm)] bg-muted-surface" />
    </div>
  );
}
