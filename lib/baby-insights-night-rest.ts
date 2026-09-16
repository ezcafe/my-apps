import { toLocalDateString } from "@/lib/money-date-calendar";

export type BabyNightRestCareItem = {
  type: string;
  at: string;
  endedAt?: string | null;
};

export type BabyNightRestDay = {
  date: string;
  nightSleepMinutes: number;
  intervalCount: number;
};

export type BabyNightRestSeries = {
  days: BabyNightRestDay[];
  emptyReason?: "need_more_sleep_logs";
};

export type DeriveNightRestOptions = {
  fromDate: string;
  toDate: string;
  nightWindow?: { startHour: number; endHour: number };
};

function parseLocalParts(ymd: string): { y: number; m: number; d: number } | null {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function eachLocalDateInclusive(fromDate: string, toDate: string): string[] {
  const out: string[] = [];
  const start = parseLocalParts(fromDate);
  const endParts = parseLocalParts(toDate);
  if (!start || !endParts) return out;
  const cur = new Date(start.y, start.m - 1, start.d);
  const end = new Date(endParts.y, endParts.m - 1, endParts.d);
  while (cur <= end) {
    out.push(toLocalDateString(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function localAt(ymd: string, hour: number, minute = 0): Date {
  const p = parseLocalParts(ymd)!;
  return new Date(p.y, p.m - 1, p.d, hour, minute, 0, 0);
}

function prevLocalDate(ymd: string): string {
  const p = parseLocalParts(ymd)!;
  const d = new Date(p.y, p.m - 1, p.d);
  d.setDate(d.getDate() - 1);
  return toLocalDateString(d);
}

function overlapMinutes(
  sleepStart: number,
  sleepEnd: number,
  winStart: number,
  winEnd: number,
): number {
  const start = Math.max(sleepStart, winStart);
  const end = Math.min(sleepEnd, winEnd);
  if (end <= start) return 0;
  return Math.floor((end - start) / 60_000);
}

/**
 * Per-morning Night Rest duration from completed sleep overlapping
 * [D−1 19:00, D 08:00). Never emits efficiency %. Pure — no I/O.
 */
export function deriveNightRestSeries(
  items: readonly BabyNightRestCareItem[],
  opts: DeriveNightRestOptions,
): BabyNightRestSeries {
  const startHour = opts.nightWindow?.startHour ?? 19;
  const endHour = opts.nightWindow?.endHour ?? 8;
  const daysOut: BabyNightRestDay[] = [];

  for (const date of eachLocalDateInclusive(opts.fromDate, opts.toDate)) {
    const prev = prevLocalDate(date);
    const winStart = localAt(prev, startHour).getTime();
    const winEnd = localAt(date, endHour).getTime();

    let nightSleepMinutes = 0;
    let intervalCount = 0;

    for (const item of items) {
      if (item.type !== "sleep") continue;
      if (item.endedAt == null || item.endedAt === "") continue;
      const sleepStart = Date.parse(item.at);
      const sleepEnd = Date.parse(item.endedAt);
      if (
        !Number.isFinite(sleepStart) ||
        !Number.isFinite(sleepEnd) ||
        sleepEnd <= sleepStart
      ) {
        continue;
      }
      const mins = overlapMinutes(sleepStart, sleepEnd, winStart, winEnd);
      if (mins > 0) {
        nightSleepMinutes += mins;
        intervalCount += 1;
      }
    }

    if (intervalCount > 0) {
      daysOut.push({ date, nightSleepMinutes, intervalCount });
    }
  }

  if (daysOut.length === 0) {
    return { days: [], emptyReason: "need_more_sleep_logs" };
  }
  return { days: daysOut };
}
