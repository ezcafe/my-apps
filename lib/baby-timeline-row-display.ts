import { formatBabyDurationCompact } from "@/lib/baby-format-duration";

export type BabyTimelineDisplayItem = {
  kind: string;
  type: string;
  at: string;
  endedAt: string | null;
  summary: string;
  payload?: unknown;
};

/**
 * Stop clock for Insights: feed uses occurredAt (`at`);
 * closed sleep uses endedAt; open sleep / diaper use at.
 */
export function babyTimelineStopAtIso(
  item: BabyTimelineDisplayItem,
): string | null {
  if (item.kind === "care" && item.type === "sleep" && item.endedAt) {
    return item.endedAt;
  }
  return item.at;
}

const COMPACT_DURATION_SUFFIX =
  /\s*·\s*(\d+h(?:\s+\d+m)?|\d+m)\s*$/;

/**
 * Insights list label: strip trailing compact duration so it shows once
 * beside the stop clock (not duplicated in the summary).
 */
export function babyTimelineSummaryLabel(summary: string): string {
  return summary.replace(COMPACT_DURATION_SUFFIX, "").trimEnd();
}

/** Compact duration already embedded in summary, or derived from payload/endedAt. */
export function babyTimelineDurationLabel(
  item: BabyTimelineDisplayItem,
): string | null {
  const fromSummary = item.summary.match(COMPACT_DURATION_SUFFIX);
  if (fromSummary?.[1]) return fromSummary[1];

  if (item.kind !== "care") return null;
  const p = (item.payload ?? {}) as Record<string, unknown>;
  if (item.type === "feed" && typeof p.durationSec === "number") {
    return formatBabyDurationCompact(p.durationSec);
  }
  if (item.type === "sleep" && item.endedAt) {
    const start = Date.parse(item.at);
    const end = Date.parse(item.endedAt);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      return formatBabyDurationCompact(Math.floor((end - start) / 1000));
    }
  }
  return null;
}

/** Local clock string for stop time (no full toLocaleString dump). */
export function formatBabyTimelineStopClock(
  iso: string,
  locale: string,
): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
