import type { AnalyticsFiltersValue } from "@/components/analytics-filters";

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
  return sp.toString();
}
