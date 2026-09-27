"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

export function LoansInsightsUrgencyStrip({
  overdue,
  dueSoon,
}: {
  overdue: number;
  dueSoon: number;
}) {
  const warning = overdue > 0;
  const overdueLabel = overdue === 1 ? "1 loan" : String(overdue);
  return (
    <section
      aria-label="Loan urgency"
      data-testid="loans-insights-urgency"
      className={cn(
        "flex flex-wrap items-baseline gap-x-5 gap-y-3 rounded-[var(--radius-md)] border px-3.5 py-3",
        warning
          ? "border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)]"
          : "border-border bg-surface",
      )}
    >
      <div>
        <p className="text-[13px] text-muted">Overdue</p>
        <p
          className={cn(
            "text-base font-semibold tabular-nums",
            warning ? "text-[var(--alert-warning-title)]" : "text-foreground",
          )}
        >
          {overdueLabel}
        </p>
      </div>
      <div>
        <p className="text-[13px] text-muted">Due this week</p>
        <p className="text-base font-semibold tabular-nums text-foreground">
          {dueSoon}
        </p>
      </div>
      <Link
        href="/loans"
        className="ms-auto text-sm font-medium text-accent underline-offset-4 hover:underline"
      >
        View loans
      </Link>
    </section>
  );
}

export function LoansInsightsUrgencyStripSkeleton() {
  return (
    <div
      aria-hidden
      data-testid="loans-insights-urgency-skeleton"
      className="flex flex-wrap items-baseline gap-x-5 gap-y-3 rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-3"
    >
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-14 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-5 w-10 rounded-[var(--radius-sm)]" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-20 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-5 w-8 rounded-[var(--radius-sm)]" />
      </div>
      <Skeleton className="ms-auto h-4 w-20 rounded-[var(--radius-sm)]" />
    </div>
  );
}
