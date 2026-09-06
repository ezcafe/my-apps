/** Care types shown on Baby home last-status. */
export const BABY_CARE_STATUS_TYPES = ["feed", "sleep", "diaper"] as const;

export type BabyCareStatusType = (typeof BABY_CARE_STATUS_TYPES)[number];

/** Minimal timeline row shape for last-of-type reduce. */
export type BabyCareStatusItem = {
  type: string;
  at: string;
  endedAt: string | null;
  summary: string;
};

export type LastCareStatusByType = {
  feed: BabyCareStatusItem | null;
  sleep: BabyCareStatusItem | null;
  diaper: BabyCareStatusItem | null;
};

/**
 * Newest-first list → first feed / sleep / diaper (or null).
 * Sleep with `endedAt == null` is “in progress” for UI consumers.
 * Growth and unknown types are ignored.
 */
export function lastCareStatusByType(
  items: readonly BabyCareStatusItem[],
): LastCareStatusByType {
  const result: LastCareStatusByType = {
    feed: null,
    sleep: null,
    diaper: null,
  };
  for (const item of items) {
    if (item.type === "feed" && result.feed == null) result.feed = item;
    else if (item.type === "sleep" && result.sleep == null) result.sleep = item;
    else if (item.type === "diaper" && result.diaper == null) result.diaper = item;
    if (result.feed && result.sleep && result.diaper) break;
  }
  return result;
}

/** True when all three care types have a last status. */
export function hasAllCareStatuses(status: LastCareStatusByType): boolean {
  return Boolean(status.feed && status.sleep && status.diaper);
}

/** Rows per timeline page when walking home last-ever status. */
export const BABY_LAST_CARE_PAGE_LIMIT = 50;

/** Cap pages walked on home (3 × 50 = 150 rows). */
export const BABY_LAST_CARE_MAX_PAGES = 3;

/**
 * Continue paging while a care type is still missing, under the page cap,
 * and the API still has a next cursor.
 */
export function shouldFetchNextCareStatusPage(
  status: LastCareStatusByType,
  pagesFetched: number,
  nextCursor: string | null | undefined,
  maxPages: number = BABY_LAST_CARE_MAX_PAGES,
): boolean {
  if (hasAllCareStatuses(status)) return false;
  if (pagesFetched >= maxPages) return false;
  if (nextCursor == null || nextCursor === "") return false;
  return true;
}
