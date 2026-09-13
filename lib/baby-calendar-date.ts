/** Real calendar date parts (YYYY-MM-DD). Not a Date object. */
export type BabyCalendarDate = { year: number; month: number; day: number };

/**
 * Accepts only a real YYYY-MM-DD date. Round-trips through UTC (no DST) to
 * reject impossible days like 2026-02-30 and non-leap 2023-02-29.
 */
export function parseBabyCalendarDate(
  raw: string | null | undefined,
): BabyCalendarDate | null {
  if (typeof raw !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/** Whole days since the epoch for a calendar date. UTC has no DST. */
export function babyCalendarDayNumber(d: BabyCalendarDate): number {
  return Math.round(Date.UTC(d.year, d.month - 1, d.day) / 86_400_000);
}
