import { toLocalDateString } from "@/lib/money-date-calendar";

export type BabyHydrationCareItem = {
  type: string;
  at: string;
  payload?: unknown;
};

export type BabyHydrationDay = {
  date: string;
  wetCount: number;
  feedCount: number;
  formulaMl?: number;
};

export type BabyHydrationSeries = {
  days: BabyHydrationDay[];
  alert: "low_wet" | null;
  emptyReason?: "need_more_logs";
};

export type DeriveHydrationOptions = {
  fromDate: string;
  toDate: string;
  /** When true, suppress low_wet (incomplete slice). */
  hasMorePages?: boolean;
};

function localDayKey(iso: string): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return toLocalDateString(new Date(ms));
}

function diaperKind(payload: unknown): string | null {
  if (payload == null || typeof payload !== "object") return null;
  const kind = (payload as Record<string, unknown>).kind;
  return typeof kind === "string" ? kind : null;
}

function formulaMlFromPayload(payload: unknown): number {
  if (payload == null || typeof payload !== "object") return 0;
  const ml = (payload as Record<string, unknown>).amountMl;
  if (typeof ml !== "number" || !Number.isFinite(ml) || ml <= 0) return 0;
  return ml;
}

function eachLocalDateInclusive(
  fromDate: string,
  toDate: string,
): string[] {
  const out: string[] = [];
  const [fy, fm, fd] = fromDate.split("-").map(Number);
  const [ty, tm, td] = toDate.split("-").map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return out;
  const cur = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  while (cur <= end) {
    out.push(toLocalDateString(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * Daily wet (wet+mixed) vs feeds / formula ml for Hydration Monitor.
 * Never invents breast ml from duration. Pure — no I/O.
 */
export function deriveHydrationSeries(
  items: readonly BabyHydrationCareItem[],
  opts: DeriveHydrationOptions,
): BabyHydrationSeries {
  const dayMap = new Map<string, BabyHydrationDay>();

  for (const date of eachLocalDateInclusive(opts.fromDate, opts.toDate)) {
    dayMap.set(date, { date, wetCount: 0, feedCount: 0 });
  }

  for (const item of items) {
    const date = localDayKey(item.at);
    if (!date || !dayMap.has(date)) continue;

    const day = dayMap.get(date)!;
    if (item.type === "diaper") {
      const kind = diaperKind(item.payload);
      if (kind === "wet" || kind === "mixed") day.wetCount += 1;
    } else if (item.type === "feed") {
      day.feedCount += 1;
      const ml = formulaMlFromPayload(item.payload);
      if (ml > 0) day.formulaMl = (day.formulaMl ?? 0) + ml;
    }
  }

  const days = [...dayMap.values()];
  const hasUsefulSignal = days.some(
    (d) => d.wetCount > 0 || d.feedCount > 0 || (d.formulaMl ?? 0) > 0,
  );

  if (!hasUsefulSignal) {
    return { days: [], alert: null, emptyReason: "need_more_logs" };
  }

  // Soft empty when no wet and no useful feed/formula (dry-only etc.)
  const hasWetOrIntake = days.some(
    (d) => d.wetCount > 0 || d.feedCount > 0 || (d.formulaMl ?? 0) > 0,
  );
  if (!hasWetOrIntake) {
    return { days: [], alert: null, emptyReason: "need_more_logs" };
  }

  // Prefer series days that have any signal for chart rendering
  const seriesDays = days.filter(
    (d) => d.wetCount > 0 || d.feedCount > 0 || (d.formulaMl ?? 0) > 0,
  );

  let alert: "low_wet" | null = null;
  if (!opts.hasMorePages) {
    for (const d of days) {
      const hasIntake = d.feedCount >= 1 || (d.formulaMl ?? 0) > 0;
      if (d.wetCount < 6 && hasIntake) {
        alert = "low_wet";
        break;
      }
    }
  }

  return { days: seriesDays, alert };
}
