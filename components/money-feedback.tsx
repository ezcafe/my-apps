"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { MoneyQuickPickGroupSkeleton } from "@/components/money-dashboard-skeleton";
import { queryErrorMessage } from "@/lib/user-facing-error";
import { resetRequestCircuit } from "@/lib/request-circuit";
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
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            resetRequestCircuit();
            onRetry();
          }}
        >
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
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("px-4 py-4", className)}>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
        {value}
      </p>
    </Card>
  );
}

export function MoneyListSkeleton({
  variant,
  className,
  tileCount = 3,
  showAccentBar = true,
}: {
  variant: "summaryTiles" | "cardGrid" | "tableRows" | "panelCards" | "loansTable";
  className?: string;
  /** Number of summary tiles (default 3). Use 1 for portfolio value. */
  tileCount?: number;
  /** Left chart-color bar on summary tiles. Off for Insights-style metrics. */
  showAccentBar?: boolean;
}) {
  if (variant === "summaryTiles") {
    return (
      <div
        className={cn(
          "grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3",
          className,
        )}
        aria-hidden
      >
        {Array.from({ length: tileCount }, (_, i) => (
          <Card
            key={`summary-tile-${i}`}
            className={cn(
              "px-4 py-4",
              showAccentBar && "relative overflow-hidden",
            )}
          >
            {showAccentBar ? (
              <div
                className={cn(
                  "absolute inset-y-0 start-0 w-1 rounded-s-[var(--radius-sm)]",
                  chartAccentBarClass(i + 4),
                )}
                aria-hidden
              />
            ) : null}
            <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-2 h-8 w-32 max-w-full rounded-[var(--radius-sm)] sm:h-9" />
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "loansTable") {
    return (
      <div className={cn("@container space-y-4", className)} aria-hidden>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-6 w-24 rounded-[var(--radius-sm)]" />
          <MoneyQuickPickGroupSkeleton
            widths={["w-16", "w-16", "w-16", "w-16", "w-16"]}
          />
        </div>
        <div className="hidden @md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: 7 }, (_, i) => (
                  <TableHead key={`loan-table-head-${i}`}>
                    <Skeleton className="h-4 w-full rounded-[var(--radius-sm)]" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }, (_, row) => (
                <TableRow key={`loan-table-row-${row}`}>
                  {Array.from({ length: 7 }, (_, col) => (
                    <TableCell key={`loan-table-row-${row}-col-${col}`}>
                      <Skeleton className="h-4 w-full rounded-[var(--radius-sm)]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ul className="space-y-3 @md:hidden">
          {Array.from({ length: 3 }, (_, i) => (
            <li
              key={`loan-mobile-card-${i}`}
              className="rounded-[var(--radius-md)] border border-border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-32 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-5 w-16 rounded-[var(--radius-sm)]" />
              </div>
              <div className="mt-3 space-y-1.5">
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
              <Skeleton className="mt-3 h-4 w-24 rounded-[var(--radius-sm)]" />
            </li>
          ))}
        </ul>
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
                <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-4 w-10 rounded-[var(--radius-sm)]" />
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
            <Skeleton className="mt-4 h-4 w-24 rounded-[var(--radius-sm)]" />
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
        <section className="w-full min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-6 w-28 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-4 w-28 rounded-[var(--radius-sm)]" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: 4 }, (_, i) => (
                  <TableHead key={`holdings-head-${i}`}>
                    <Skeleton className="h-4 w-12 rounded-[var(--radius-sm)]" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }, (_, row) => (
                <TableRow key={`holdings-row-${row}`}>
                  <TableCell>
                    <Skeleton className="h-6 w-14 rounded-[var(--radius-sm)]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28 rounded-[var(--radius-sm)]" />
                  </TableCell>
                  <TableCell align="end">
                    <Skeleton className="ms-auto h-4 w-10 rounded-[var(--radius-sm)]" />
                  </TableCell>
                  <TableCell align="end">
                    <Skeleton className="ms-auto h-4 w-16 rounded-[var(--radius-sm)]" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>
    );
  }

  return (
    <div className={cn("@container space-y-2", className)} aria-hidden>
      <div className="hidden @md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 6 }, (_, col) => (
                <TableHead key={`table-head-${col}`}>
                  <Skeleton className="h-4 w-full rounded-[var(--radius-sm)]" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }, (_, i) => (
              <TableRow key={`table-row-${i}`}>
                {Array.from({ length: 6 }, (_, col) => (
                  <TableCell key={`table-row-${i}-col-${col}`}>
                    <Skeleton className="h-4 w-full rounded-[var(--radius-sm)]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-2 @md:hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={`table-mobile-card-${i}`}
            className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-3"
          >
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-5 w-16 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
            </div>
            <Skeleton className="mt-1 h-4 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-2 h-4 w-24 rounded-[var(--radius-sm)]" />
          </div>
        ))}
      </div>
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
