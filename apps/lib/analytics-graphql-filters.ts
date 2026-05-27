import type { AnalyticsFiltersValue } from "@/components/analytics-filters";
import { buildQuery } from "@/lib/analytics-build-query";

function stringArraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Shallow equality for analytics filter state (stable query keys, dirty checks). */
export function analyticsFiltersEqual(
  a: AnalyticsFiltersValue,
  b: AnalyticsFiltersValue,
): boolean {
  return (
    a.fromDate === b.fromDate &&
    a.toDate === b.toDate &&
    stringArraysEqual(a.accountIds, b.accountIds) &&
    stringArraysEqual(a.categoryIds, b.categoryIds) &&
    stringArraysEqual(a.merchantIds, b.merchantIds) &&
    stringArraysEqual(a.tagIds, b.tagIds) &&
    stringArraysEqual(a.kinds, b.kinds)
  );
}

/** Tuple segment for TanStack Query keys (no JSON.stringify). */
export function analyticsFiltersQueryKey(applied: AnalyticsFiltersValue) {
  return [
    applied.fromDate,
    applied.toDate,
    applied.accountIds,
    applied.categoryIds,
    applied.merchantIds,
    applied.tagIds,
    applied.kinds,
  ] as const;
}

/** Maps UI analytics filters to `AnalyticsFiltersInput` for GraphQL. */
export function analyticsFiltersToGraphQLInput(
  f: AnalyticsFiltersValue,
): Record<string, unknown> {
  const qs = buildQuery(f);
  const u = new URLSearchParams(qs);
  const out: Record<string, unknown> = {};

  const from = u.get("from");
  const to = u.get("to");
  if (from) out.from = from;
  if (to) out.to = to;

  const accountIds = u.getAll("accountIds");
  if (accountIds.length) out.accountIds = accountIds;

  const categoryIds = u.getAll("categoryIds");
  if (categoryIds.length) out.categoryIds = categoryIds;

  const merchantIds = u.getAll("merchantIds");
  if (merchantIds.length) out.merchantIds = merchantIds;

  const tagIds = u.getAll("tagIds");
  if (tagIds.length) out.tagIds = tagIds;

  const kinds = u.getAll("kinds");
  if (kinds.length) out.kinds = kinds;

  return out;
}
