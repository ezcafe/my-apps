/** UTC calendar month bounds for monthly money budgets (matches Money settings). */

export function utcCalendarMonthRangeIso(date: Date = new Date()): {
  from: string;
  to: string;
} {
  const from = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const to = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Stable key for React Query caches, e.g. `"2025-05"`. */
export function utcCalendarMonthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
