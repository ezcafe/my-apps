"use client";

import { useFormatDate } from "@/lib/format-date";
import { cn } from "@/lib/cn";

/** Read-only active range label and active filter values for ledger and insights dashboards. */
export function AnalyticsPeriodChip({
  fromDate,
  toDate,
  activeFilters,
  dirty = false,
  className,
}: {
  fromDate: string;
  toDate: string;
  /** Active filter summary labels (e.g. `["Spending", "Groceries"]`). */
  activeFilters?: readonly string[];
  /** Draft filters differ from applied — prompt Apply. */
  dirty?: boolean;
  className?: string;
}) {
  const { formatDate, formatPeriod } = useFormatDate();
  const period =
    formatPeriod(fromDate, toDate) ||
    `${formatDate(fromDate, { omitYear: true }) || "—"} – ${formatDate(toDate, { omitYear: true }) || "—"}`;

  return (
    <p
      className={cn("text-sm text-muted fx-fade-in", className)}
      aria-live="polite"
    >
      Showing{" "}
      <span className="font-medium text-foreground tabular-nums">{period}</span>
      {activeFilters && activeFilters.length > 0 ? (
        <>
          {activeFilters.map((filter, index) => (
            <span key={`${filter}-${index}`}>
              {" "}
              ·{" "}
              <span className="font-medium text-foreground">{filter}</span>
            </span>
          ))}
        </>
      ) : null}
      {dirty ? (
        <>
          {" "}
          ·{" "}
          <span className="font-medium text-foreground">Apply to update</span>
        </>
      ) : null}
    </p>
  );
}
