import { toLocalDateString } from "@/lib/money-date-calendar";

export type BabyDeferredCareItem = {
  type: string;
  at: string;
  endedAt?: string | null;
  payload?: unknown;
};

export type DeriveDeferredOptions = {
  fromDate: string;
  toDate: string;
  rollingDays?: number;
};

function parseLocalParts(ymd: string): { y: number; m: number; d: number } | null {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function distinctLocalDayCount(fromDate: string, toDate: string): number {
  const start = parseLocalParts(fromDate);
  const end = parseLocalParts(toDate);
  if (!start || !end) return 0;
  const a = Date.UTC(start.y, start.m - 1, start.d);
  const b = Date.UTC(end.y, end.m - 1, end.d);
  return Math.floor((b - a) / 86_400_000) + 1;
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

function localDayKey(iso: string): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return toLocalDateString(new Date(ms));
}

function minutesFromMidnight(iso: string): number | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function payloadStr(payload: unknown, key: string): string | null {
  if (payload == null || typeof payload !== "object") return null;
  const v = (payload as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}

export type DiaperOutputBuckets = {
  wet: number;
  normal: number;
  watery: number;
  blowouts: number;
};

export type DiaperOutputSeries = {
  buckets?: DiaperOutputBuckets;
  shares?: {
    wet: number;
    normal: number;
    watery: number;
    blowouts: number;
  };
  alert?: "high_watery" | null;
  emptyReason?: "need_more_texture_logs";
};

export function deriveDiaperOutputSeries(
  items: readonly BabyDeferredCareItem[],
  _opts: DeriveDeferredOptions,
): DiaperOutputSeries {
  const buckets: DiaperOutputBuckets = {
    wet: 0,
    normal: 0,
    watery: 0,
    blowouts: 0,
  };
  let texturedCount = 0;

  for (const item of items) {
    if (item.type !== "diaper") continue;
    const kind = payloadStr(item.payload, "kind");
    if (kind === "wet") {
      buckets.wet += 1;
      continue;
    }
    if (kind !== "dirty" && kind !== "mixed") continue;

    const texture = payloadStr(item.payload, "texture");
    const amount = payloadStr(item.payload, "amount");

    if (texture == null) continue;
    texturedCount += 1;

    if (texture === "watery") {
      buckets.watery += 1;
    } else if (
      texture === "soft" ||
      texture === "seedy" ||
      texture === "mushy" ||
      texture === "hard" ||
      texture === "formed"
    ) {
      buckets.normal += 1;
    }

    if (amount === "blowout") {
      buckets.blowouts += 1;
    }
  }

  if (texturedCount < 3) {
    return { emptyReason: "need_more_texture_logs" };
  }

  const denom =
    buckets.wet + buckets.normal + buckets.watery + buckets.blowouts;
  const shares =
    denom > 0
      ? {
          wet: buckets.wet / denom,
          normal: buckets.normal / denom,
          watery: buckets.watery / denom,
          blowouts: buckets.blowouts / denom,
        }
      : undefined;

  const stoolDenom = buckets.normal + buckets.watery + buckets.blowouts;
  const wateryShare = stoolDenom > 0 ? buckets.watery / stoolDenom : 0;
  const alert = wateryShare > 0.2 ? ("high_watery" as const) : null;

  return { buckets, shares, alert };
}

export type AwakeTrendDay = {
  date: string;
  meanWakeMinutes: number;
  rollingMeanWakeMinutes?: number;
};

export type AwakeTrendSeries = {
  days?: AwakeTrendDay[];
  emptyReason?: "need_3_days" | "need_more_sleep_logs";
};

export function deriveAwakeWindowTrendSeries(
  items: readonly BabyDeferredCareItem[],
  opts: DeriveDeferredOptions,
): AwakeTrendSeries {
  if (distinctLocalDayCount(opts.fromDate, opts.toDate) < 3) {
    return { emptyReason: "need_3_days" };
  }

  const sleeps = items
    .filter((i) => i.type === "sleep" && i.endedAt)
    .map((i) => ({
      start: Date.parse(i.at),
      end: Date.parse(String(i.endedAt)),
    }))
    .filter(
      (s) =>
        Number.isFinite(s.start) &&
        Number.isFinite(s.end) &&
        s.end > s.start,
    )
    .sort((a, b) => a.start - b.start);

  if (sleeps.length < 2) {
    return { emptyReason: "need_more_sleep_logs" };
  }

  const gapsByDay = new Map<string, number[]>();
  for (let i = 1; i < sleeps.length; i++) {
    const wakeMs = sleeps[i]!.start - sleeps[i - 1]!.end;
    if (wakeMs <= 0) continue;
    const day = localDayKey(new Date(sleeps[i]!.start).toISOString());
    if (!day) continue;
    if (day < opts.fromDate || day > opts.toDate) continue;
    const list = gapsByDay.get(day) ?? [];
    list.push(wakeMs / 60_000);
    gapsByDay.set(day, list);
  }

  const dayPoints: AwakeTrendDay[] = [];
  for (const date of eachLocalDateInclusive(opts.fromDate, opts.toDate)) {
    const gaps = gapsByDay.get(date);
    if (!gaps || gaps.length === 0) continue;
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    dayPoints.push({
      date,
      meanWakeMinutes: Math.round(mean * 10) / 10,
    });
  }

  if (dayPoints.length < 2) {
    return { emptyReason: "need_more_sleep_logs" };
  }

  const rollingDays = opts.rollingDays ?? 7;
  for (let i = 0; i < dayPoints.length; i++) {
    const window = dayPoints.slice(Math.max(0, i + 1 - rollingDays), i + 1);
    if (window.length >= 3) {
      const rolling =
        window.reduce((a, d) => a + d.meanWakeMinutes, 0) / window.length;
      dayPoints[i]!.rollingMeanWakeMinutes = Math.round(rolling * 10) / 10;
    }
  }

  return { days: dayPoints };
}

export type PatternDay = {
  date: string;
  sleepBlocks: Array<{ startMin: number; endMin: number }>;
  markers: Array<{ minuteOfDay: number; kind: "feed" | "diaper" }>;
};

export type PatternFinderSeries = {
  days?: PatternDay[];
  emptyReason?: "need_more_logs";
};

export function derivePatternFinderSeries(
  items: readonly BabyDeferredCareItem[],
  opts: DeriveDeferredOptions,
): PatternFinderSeries {
  const days = eachLocalDateInclusive(opts.fromDate, opts.toDate).map(
    (date) =>
      ({
        date,
        sleepBlocks: [] as Array<{ startMin: number; endMin: number }>,
        markers: [] as Array<{ minuteOfDay: number; kind: "feed" | "diaper" }>,
      }) satisfies PatternDay,
  );
  const byDate = new Map(days.map((d) => [d.date, d]));

  for (const item of items) {
    if (item.type === "feed" || item.type === "diaper") {
      const date = localDayKey(item.at);
      const min = minutesFromMidnight(item.at);
      const row = date ? byDate.get(date) : undefined;
      if (row && min != null) {
        row.markers.push({
          minuteOfDay: Math.floor(min),
          kind: item.type,
        });
      }
    } else if (item.type === "sleep" && item.endedAt) {
      const startMs = Date.parse(item.at);
      const endMs = Date.parse(item.endedAt);
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        continue;
      }
      // Clip into local day rows
      let cursor = startMs;
      while (cursor < endMs) {
        const d = new Date(cursor);
        const date = toLocalDateString(d);
        const row = byDate.get(date);
        const dayStart = new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate(),
          0,
          0,
          0,
          0,
        ).getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;
        const blockEnd = Math.min(endMs, dayEnd);
        if (row) {
          const startMin = Math.floor((cursor - dayStart) / 60_000);
          const endMin = Math.floor((blockEnd - dayStart) / 60_000);
          if (endMin > startMin) {
            row.sleepBlocks.push({ startMin, endMin: Math.min(endMin, 1440) });
          }
        }
        cursor = blockEnd;
      }
    }
  }

  const withMarkers = days.filter(
    (d) => d.sleepBlocks.length > 0 || d.markers.length > 0,
  );
  if (withMarkers.length < 2) {
    return { emptyReason: "need_more_logs" };
  }
  return { days };
}
