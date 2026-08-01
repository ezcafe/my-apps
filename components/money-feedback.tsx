"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { queryErrorMessage } from "@/lib/user-facing-error";
import { AnalyticsEmptyState } from "@/components/analytics-empty-state";

export function MoneyQueryErrorAlert({
  title,
  error,
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  title: string;
  error: unknown;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  const description =
    queryErrorMessage(error) ?? "Something went wrong. Please try again.";

  return (
    <div className={cn("space-y-3", className)}>
      <Alert variant="error" title={title} description={description} />
      {onRetry ? (
        <Button type="button" variant="secondary" size="md" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

const CHART_ACCENT_BAR = [
  "bg-chart-0",
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-chart-6",
  "bg-chart-7",
] as const;

export function chartAccentBarClass(index: number): string {
  return CHART_ACCENT_BAR[((index % 8) + 8) % 8] ?? CHART_ACCENT_BAR[0];
}

export function MoneyStatCard({
  label,
  value,
  accentIndex = 0,
  className,
}: {
  label: string;
  value: ReactNode;
  accentIndex?: number;
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden p-4", className)}>
      <div
        className={cn(
          "absolute inset-y-0 start-0 w-1 rounded-s-[var(--radius-sm)]",
          chartAccentBarClass(accentIndex),
        )}
        aria-hidden
      />
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

export function MoneyListSkeleton({
  variant,
  className,
  tileCount = 3,
}: {
  variant: "summaryTiles" | "cardGrid" | "tableRows" | "panelCards" | "loansTable";
  className?: string;
  /** Number of summary tiles (default 3). Use 1 for portfolio value. */
  tileCount?: number;
}) {
  if (variant === "summaryTiles") {
    return (
      <div
        className={cn(
          "grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]",
          className,
        )}
        aria-hidden
      >
        {Array.from({ length: tileCount }, (_, i) => (
          <Card
            key={`summary-tile-${i}`}
            className="relative overflow-hidden p-4"
          >
            <div
              className={cn(
                "absolute inset-y-0 start-0 w-1 rounded-s-[var(--radius-sm)]",
                chartAccentBarClass(i + 4),
              )}
              aria-hidden
            />
            <Skeleton className="h-3 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-2 h-7 w-24 rounded-[var(--radius-sm)]" />
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "loansTable") {
    return (
      <div className={cn("space-y-4", className)} aria-hidden>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-5 w-24 rounded-[var(--radius-sm)]" />
          <div className="inline-flex gap-1 rounded-[var(--radius-sm)] border border-border p-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton
                key={`loan-filter-${i}`}
                className="h-7 w-16 rounded-[var(--radius-sm)]"
              />
            ))}
          </div>
        </div>
        <Card className="w-full min-w-0 p-4">
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
            <div
              className="grid gap-3 bg-muted-surface px-3 py-2"
              style={{
                gridTemplateColumns:
                  "minmax(0,1.4fr) minmax(0,0.8fr) minmax(0,0.9fr) minmax(0,0.8fr) minmax(0,0.8fr) minmax(0,0.6fr) minmax(0,1.1fr)",
              }}
            >
              {Array.from({ length: 7 }, (_, i) => (
                <Skeleton
                  key={`loan-table-head-${i}`}
                  className="h-4 w-full rounded-[var(--radius-sm)]"
                />
              ))}
            </div>
            <div className="divide-y divide-border px-3">
              {Array.from({ length: 4 }, (_, row) => (
                <div
                  key={`loan-table-row-${row}`}
                  className="grid gap-3 py-3"
                  style={{
                    gridTemplateColumns:
                      "minmax(0,1.4fr) minmax(0,0.8fr) minmax(0,0.9fr) minmax(0,0.8fr) minmax(0,0.8fr) minmax(0,0.6fr) minmax(0,1.1fr)",
                  }}
                >
                  {Array.from({ length: 7 }, (_, col) => (
                    <Skeleton
                      key={`loan-table-row-${row}-col-${col}`}
                      className="h-4 w-full rounded-[var(--radius-sm)]"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (variant === "cardGrid") {
    return (
      <div
        className={cn(
          "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]",
          className,
        )}
        aria-hidden
      >
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={`card-grid-${i}`} className="flex h-full flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-6 w-36 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-5 w-14 rounded-[var(--radius-sm)]" />
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between gap-2">
                <Skeleton className="h-3 w-16 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-3 w-10 rounded-[var(--radius-sm)]" />
              </div>
              <Skeleton className="h-2 w-full rounded-[var(--radius-sm)]" />
            </div>
            <div className="mt-4 flex flex-1 flex-col gap-2">
              <div className="flex justify-between gap-2">
                <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
              </div>
              <div className="flex justify-between gap-2">
                <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-4 w-14 rounded-[var(--radius-sm)]" />
              </div>
              <div className="flex justify-between gap-2">
                <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
              </div>
            </div>
            <Skeleton className="mt-4 h-3 w-24 rounded-[var(--radius-sm)]" />
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "panelCards") {
    return (
      <div className={cn("space-y-4", className)} aria-hidden>
        <Card className="p-4">
          <Skeleton className="h-6 w-36 rounded-[var(--radius-sm)]" />
          <Skeleton className="mt-3 h-56 w-full rounded-[var(--radius-sm)]" />
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-6 w-28 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-4 w-28 rounded-[var(--radius-sm)]" />
          </div>
          <div className="overflow-x-auto">
            <div
              className="grid gap-3 border-b border-border pb-2 text-xs"
              style={{
                gridTemplateColumns:
                  "minmax(0,0.8fr) minmax(0,1.4fr) minmax(0,0.7fr) minmax(0,0.9fr)",
              }}
            >
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton
                  key={`holdings-head-${i}`}
                  className="h-3 w-12 rounded-[var(--radius-sm)]"
                />
              ))}
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }, (_, row) => (
                <div
                  key={`holdings-row-${row}`}
                  className="grid gap-3 py-2.5"
                  style={{
                    gridTemplateColumns:
                      "minmax(0,0.8fr) minmax(0,1.4fr) minmax(0,0.7fr) minmax(0,0.9fr)",
                  }}
                >
                  <Skeleton className="h-6 w-14 rounded-[var(--radius-sm)]" />
                  <Skeleton className="h-4 w-28 rounded-[var(--radius-sm)]" />
                  <Skeleton className="ms-auto h-4 w-10 rounded-[var(--radius-sm)]" />
                  <Skeleton className="ms-auto h-4 w-16 rounded-[var(--radius-sm)]" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton
          key={`table-row-${i}`}
          className="h-12 w-full rounded-[var(--radius-sm)]"
        />
      ))}
    </div>
  );
}

/** Primary CTA styled like Button but as a Next.js Link. */
export function MoneyEmptyStateButtonLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={buttonClassName({ variant: "primary", size: "md", className })}
    >
      {label}
    </Link>
  );
}

/** Re-export-friendly empty state wrapper for non-analytics screens. */
export function MoneyEmptyState(
  props: ComponentProps<typeof AnalyticsEmptyState>,
) {
  return <AnalyticsEmptyState {...props} />;
}
