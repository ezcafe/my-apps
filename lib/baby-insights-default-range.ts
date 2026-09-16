import { toLocalDateString } from "@/lib/money-date-calendar";

export type BabyInsightsDateRange = {
  /** YYYY-MM-DD (HTML date input), local calendar. */
  fromDate: string;
  toDate: string;
};

/** Last 7 local calendar days ending today (inclusive). */
export function babyInsightsDefaultRange(
  now: Date = new Date(),
): BabyInsightsDateRange {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  return {
    fromDate: toLocalDateString(from),
    toDate: toLocalDateString(to),
  };
}

/**
 * Local day bounds as ISO datetimes with offset for Baby GraphQL.
 * fromDate → start of day; toDate → end of day.
 */
export function babyInsightsDateBoundsIso(
  fromDate: string,
  toDate: string,
): { from: string; to: string } {
  const [fy, fm, fd] = fromDate.split("-").map(Number);
  const [ty, tm, td] = toDate.split("-").map(Number);
  const start = new Date(fy!, fm! - 1, fd!, 0, 0, 0, 0);
  const end = new Date(ty!, tm! - 1, td!, 23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}
