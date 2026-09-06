/** Cap DOM rows for Insights timeline/growth lists (charts use full data). */
export const BABY_INSIGHTS_LIST_VISIBLE_CAP = 100;

/**
 * Slice list rows for render. Charts/KPIs keep the full loaded arrays;
 * list UI shows a capped window with optional Show more.
 */
export function babyInsightsVisibleListRows<T>(
  rows: T[],
  visibleCount: number = BABY_INSIGHTS_LIST_VISIBLE_CAP,
): { visible: T[]; hasMore: boolean; hiddenCount: number } {
  const cap = Math.max(0, visibleCount);
  if (rows.length <= cap) {
    return { visible: rows, hasMore: false, hiddenCount: 0 };
  }
  return {
    visible: rows.slice(0, cap),
    hasMore: true,
    hiddenCount: rows.length - cap,
  };
}

/** Grow visible window by one cap step (Show more). */
export function babyInsightsNextListVisibleCount(
  current: number,
  step: number = BABY_INSIGHTS_LIST_VISIBLE_CAP,
): number {
  return current + Math.max(1, step);
}
