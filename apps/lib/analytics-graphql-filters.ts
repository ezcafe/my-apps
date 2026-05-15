import type { AnalyticsFiltersValue } from "@/components/analytics-filters";
import { buildQuery } from "@/lib/analytics-build-query";

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
