/**
 * Query enable wiring for Baby Activities vs Insights (Gate B locks).
 * Activities owns timeline + growth lists on mount (no expand gate).
 * Insights growth follows existing More insights `moreOpen` only.
 */

/** Activities always enables timeline + growth list queries on mount. */
export function babyActivitiesListsEnabled(): boolean {
  return true;
}

/**
 * Insights growth list enable — Decision 2 Option 2.
 * Uses existing `moreOpen` only (not `activityOpen`, not always-on).
 */
export function babyInsightsGrowthEnabled(opts: {
  moreOpen: boolean;
}): boolean {
  return opts.moreOpen;
}

/** Insights never enables the care timeline list after the Activities move. */
export function babyInsightsTimelineListEnabled(): boolean {
  return false;
}
