/** Shared analytics filter defaults (isomorphic — safe for RSC prefetch). */

export type AnalyticsKind = "expense" | "income" | "transfer";

export type AnalyticsRecurrence = "all" | "recurring" | "one-time";

export type AnalyticsFiltersValue = {
  /** YYYY-MM-DD (HTML date input format), or "" when unset. */
  fromDate: string;
  toDate: string;
  accountIds: string[];
  categoryIds: string[];
  merchantIds: string[];
  tagIds: string[];
  kinds: AnalyticsKind[];
  recurrence: AnalyticsRecurrence;
  recurrenceSourceIds: string[];
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar month: first day through last day of the current month. */
export function defaultAnalyticsFilters(
  now: Date = new Date(),
): AnalyticsFiltersValue {
  const y = now.getFullYear();
  const m = now.getMonth();
  const fromDate = `${y}-${pad2(m + 1)}-01`;
  const last = new Date(y, m + 1, 0);
  const toDate = `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-${pad2(last.getDate())}`;
  return {
    fromDate,
    toDate,
    accountIds: [],
    categoryIds: [],
    merchantIds: [],
    tagIds: [],
    kinds: [],
    recurrence: "all",
    recurrenceSourceIds: [],
  };
}
