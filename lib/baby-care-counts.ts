import { toLocalDateString } from "@/lib/money-date-calendar";

/** One day bucket of care event counts (Option A — from loaded timeline). */
export type BabyCareCountDay = {
  day: string;
  feed: number;
  sleep: number;
  diaper: number;
};

export type BabyCareCountTimelineItem = {
  kind: string;
  type: string;
  at: string;
};

/** Local calendar YYYY-MM-DD — matches Insights period chips, not UTC ISO date. */
export function careCountDayKey(iso: string): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return toLocalDateString(new Date(ms));
}

/**
 * Empty vs partial copy for Option A care-count when timeline may still have pages.
 * Never claim “no care events” while more timeline rows exist.
 * `partial` = Load more available; `partialCapped` = more data but no Load more.
 */
export function babyCareCountChartCopy(opts: {
  dayCount: number;
  timelineIncomplete: boolean;
  canLoadMore?: boolean;
}): "empty" | "partial" | "partialCapped" | "ready" {
  const canLoadMore = opts.canLoadMore ?? opts.timelineIncomplete;
  if (!opts.timelineIncomplete) {
    return opts.dayCount > 0 ? "ready" : "empty";
  }
  if (!canLoadMore) return "partialCapped";
  return "partial";
}

/**
 * Aggregate care rows by local calendar day. Growth rows ignored.
 * Honest to loaded items only (may under-count if timeline is truncated).
 */
export function aggregateCareCountsByDay(
  items: readonly BabyCareCountTimelineItem[],
): BabyCareCountDay[] {
  const map = new Map<string, BabyCareCountDay>();

  for (const item of items) {
    if (item.kind !== "care") continue;
    if (item.type !== "feed" && item.type !== "sleep" && item.type !== "diaper") {
      continue;
    }
    const day = careCountDayKey(item.at);
    if (!day) continue;
    let bucket = map.get(day);
    if (!bucket) {
      bucket = { day, feed: 0, sleep: 0, diaper: 0 };
      map.set(day, bucket);
    }
    bucket[item.type] += 1;
  }

  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}
