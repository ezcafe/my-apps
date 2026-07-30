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
    stringArraysEqual(a.kinds, b.kinds) &&
    a.recurrence === b.recurrence &&
    stringArraysEqual(a.recurrenceSourceIds, b.recurrenceSourceIds)
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
    applied.recurrence,
    applied.recurrenceSourceIds,
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

  const recurrence = u.get("recurrence");
  if (recurrence === "recurring" || recurrence === "one-time") {
    out.recurrence = recurrence;
  }

  const recurrenceSourceIds = u.getAll("recurrenceSourceIds");
  if (recurrenceSourceIds.length) out.recurrenceSourceIds = recurrenceSourceIds;

  const accountTypes = u.getAll("accountTypes");
  if (accountTypes.length) out.accountTypes = accountTypes;

  const excludeAccountTypes = u.getAll("excludeAccountTypes");
  if (excludeAccountTypes.length) out.excludeAccountTypes = excludeAccountTypes;

  return out;
}

/** Maps a ledger/analytics URL query string to `AnalyticsFiltersInput` for GraphQL. */
export function filterQueryToGraphQLAnalyticsInput(
  filterQuery: string,
): Record<string, unknown> {
  const u = new URLSearchParams(filterQuery);
  const out: Record<string, unknown> = {};

  const from = u.get("from");
  const to = u.get("to");
  if (from) out.from = from;
  if (to) out.to = to;

  for (const key of [
    "accountIds",
    "categoryIds",
    "merchantIds",
    "tagIds",
    "kinds",
    "recurrenceSourceIds",
    "accountTypes",
    "excludeAccountTypes",
  ] as const) {
    const values = u.getAll(key);
    if (values.length) out[key] = values;
  }

  const recurrence = u.get("recurrence");
  if (recurrence === "recurring" || recurrence === "one-time") {
    out.recurrence = recurrence;
  }

  return out;
}
