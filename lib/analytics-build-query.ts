import type { AnalyticsFiltersValue } from "@/lib/analytics-default-filters";
import { CATEGORY_FILTER_NONE } from "@/lib/analytics-category-filter";

/** Map `<input type="date">` values (local calendar days) to UTC ISO bounds for the API. */
export function dateRangeParams(
  fromDate: string,
  toDate: string,
): { from: string; to: string } {
  const [fy, fm, fd] = fromDate.split("-").map(Number);
  const [ty, tm, td] = toDate.split("-").map(Number);
  const from = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
  const to = new Date(ty, tm - 1, td, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Local calendar month `YYYY-MM` → inclusive `YYYY-MM-DD` bounds. */
export function calendarMonthBounds(month: string): {
  fromDate: string;
  toDate: string;
} {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return {
    fromDate: `${y}-${mm}-01`,
    toDate: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** Local calendar day `YYYY-MM-DD` → same-day inclusive bounds. */
export function calendarDayBounds(day: string): {
  fromDate: string;
  toDate: string;
} {
  return { fromDate: day, toDate: day };
}

/**
 * Category node ids in the money-flow sankey:
 * `income_<id>` / `expense_<id>` (hub nodes like `cash_flow_node` are ignored).
 */
export function sankeyCategoryNodeFromId(
  nodeId: string,
): { categoryId: string; kind: "income" | "expense" } | null {
  if (nodeId.startsWith("income_")) {
    const categoryId = nodeId.slice("income_".length);
    return categoryId ? { categoryId, kind: "income" } : null;
  }
  if (nodeId.startsWith("expense_")) {
    const categoryId = nodeId.slice("expense_".length);
    return categoryId ? { categoryId, kind: "expense" } : null;
  }
  return null;
}

export function buildQuery(f: AnalyticsFiltersValue): string {
  const sp = new URLSearchParams();
  if (f.fromDate && f.toDate) {
    const { from, to } = dateRangeParams(f.fromDate, f.toDate);
    sp.set("from", from);
    sp.set("to", to);
  } else {
    if (f.fromDate) {
      const [y, m, d] = f.fromDate.split("-").map(Number);
      sp.set("from", new Date(y, m - 1, d, 0, 0, 0, 0).toISOString());
    }
    if (f.toDate) {
      const [y, m, d] = f.toDate.split("-").map(Number);
      sp.set("to", new Date(y, m - 1, d, 23, 59, 59, 999).toISOString());
    }
  }
  for (const id of f.accountIds) sp.append("accountIds", id);
  for (const id of f.categoryIds) sp.append("categoryIds", id);
  for (const id of f.merchantIds) sp.append("merchantIds", id);
  for (const id of f.tagIds) sp.append("tagIds", id);
  for (const k of f.kinds) sp.append("kinds", k);
  if (f.recurrence !== "all") sp.set("recurrence", f.recurrence);
  for (const id of f.recurrenceSourceIds) sp.append("recurrenceSourceIds", id);
  return sp.toString();
}

export type DrilldownFilterExtra = Partial<{
  categoryIds: string[];
  merchantIds: string[];
  tagIds: string[];
  recurrenceSourceIds: string[];
  accountIds: string[];
  kinds: ("expense" | "income" | "transfer")[];
  fromDate: string;
  toDate: string;
}>;

/** Merge analytics dashboard filters with chart drill-down dimensions. */
export function mergeDrilldownQuery(
  baseFilterQuery: string,
  extra: DrilldownFilterExtra,
): string {
  const sp = new URLSearchParams(baseFilterQuery);
  if (extra.fromDate && extra.toDate) {
    const { from, to } = dateRangeParams(extra.fromDate, extra.toDate);
    sp.set("from", from);
    sp.set("to", to);
  } else {
    if (extra.fromDate) {
      const [y, m, d] = extra.fromDate.split("-").map(Number);
      sp.set("from", new Date(y, m - 1, d, 0, 0, 0, 0).toISOString());
    }
    if (extra.toDate) {
      const [y, m, d] = extra.toDate.split("-").map(Number);
      sp.set("to", new Date(y, m - 1, d, 23, 59, 59, 999).toISOString());
    }
  }
  if (extra.categoryIds?.length) {
    sp.delete("categoryIds");
    for (const id of extra.categoryIds) sp.append("categoryIds", id);
  }
  if (extra.merchantIds?.length) {
    sp.delete("merchantIds");
    for (const id of extra.merchantIds) sp.append("merchantIds", id);
  }
  if (extra.tagIds?.length) {
    sp.delete("tagIds");
    for (const id of extra.tagIds) sp.append("tagIds", id);
  }
  if (extra.accountIds?.length) {
    sp.delete("accountIds");
    for (const id of extra.accountIds) sp.append("accountIds", id);
  }
  if (extra.recurrenceSourceIds?.length) {
    sp.delete("recurrenceSourceIds");
    for (const id of extra.recurrenceSourceIds) {
      sp.append("recurrenceSourceIds", id);
    }
  }
  if (extra.kinds?.length) {
    sp.delete("kinds");
    for (const k of extra.kinds) sp.append("kinds", k);
  }
  return sp.toString();
}

export function categoryIdForDrilldown(categoryId: string | null): string {
  return categoryId ?? CATEGORY_FILTER_NONE;
}

/**
 * Map stacked-area / sankey category series keys to a filter id.
 * Returns null for rollup buckets that cannot be drilled (`__other__`).
 */
export function seriesCategoryKeyForDrilldown(key: string): string | null {
  if (key === "__other__") return null;
  if (key === "uncategorized") return CATEGORY_FILTER_NONE;
  return key;
}

/** Resolve a line-chart x key to a `YYYY-MM-DD` calendar day for drilldown. */
export function linePointDateForDrilldown(
  key: string,
  xMode: "date" | "dayOfMonth",
  baseFilterQuery: string,
): string | null {
  if (xMode === "date") {
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
  }
  const day = Number(key);
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  const fromIso = new URLSearchParams(baseFilterQuery).get("from");
  if (!fromIso) return null;
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return null;
  const y = from.getFullYear();
  const m = from.getMonth() + 1;
  const lastDay = new Date(y, m, 0).getDate();
  const clamped = Math.min(day, lastDay);
  return `${y}-${String(m).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`;
}

export type AnalyticsChartDrilldownPayload = {
  title: string;
  filterQuery: string;
};
