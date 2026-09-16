import { toLocalDateString } from "@/lib/money-date-calendar";

export type BabyInsightKpiCareItem = {
  type: string;
  at: string;
  endedAt?: string | null;
  payload?: unknown;
};

export type DeriveInsightKpiOptions = {
  fromDate: string;
  toDate: string;
  maxLagHours?: number;
  hasMorePages?: boolean;
};

export type WakeWindowKpi =
  | { avgMinutes: number }
  | { emptyReason: "need_3_days" | "need_more_sleep_logs" };

export type MilkToDiaperLagKpi =
  | { avgLagMinutes: number }
  | { emptyReason: "need_more_logs" };

export type SleepEfficiencyKpi = {
  emptyReason: "need_night_waking_logs";
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

function completedSleeps(
  items: readonly BabyInsightKpiCareItem[],
): Array<{ start: number; end: number }> {
  const out: Array<{ start: number; end: number }> = [];
  for (const item of items) {
    if (item.type !== "sleep") continue;
    if (item.endedAt == null || item.endedAt === "") continue;
    const start = Date.parse(item.at);
    const end = Date.parse(item.endedAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      continue;
    }
    out.push({ start, end });
  }
  out.sort((a, b) => a.start - b.start);
  return out;
}

/** Average wake window between consecutive completed sleeps. */
export function deriveWakeWindowKpi(
  items: readonly BabyInsightKpiCareItem[],
  opts: DeriveInsightKpiOptions,
): WakeWindowKpi {
  const daySpan = distinctLocalDayCount(opts.fromDate, opts.toDate);
  if (daySpan < 3) {
    return { emptyReason: "need_3_days" };
  }

  const sleeps = completedSleeps(items);
  if (sleeps.length < 2) {
    return { emptyReason: "need_more_sleep_logs" };
  }

  const gaps: number[] = [];
  for (let i = 1; i < sleeps.length; i++) {
    const wakeMs = sleeps[i]!.start - sleeps[i - 1]!.end;
    if (wakeMs > 0) gaps.push(wakeMs / 60_000);
  }
  if (gaps.length === 0) {
    return { emptyReason: "need_more_sleep_logs" };
  }

  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return { avgMinutes: Math.round(avg * 10) / 10 };
}

function diaperKind(payload: unknown): string | null {
  if (payload == null || typeof payload !== "object") return null;
  const kind = (payload as Record<string, unknown>).kind;
  return typeof kind === "string" ? kind : null;
}

/** Mean feed → first eligible diaper lag (wet|dirty|mixed), capped at maxLagHours. */
export function deriveMilkToDiaperLagKpi(
  items: readonly BabyInsightKpiCareItem[],
  opts: DeriveInsightKpiOptions,
): MilkToDiaperLagKpi {
  const maxLagMs = (opts.maxLagHours ?? 6) * 3_600_000;
  const feeds = items
    .filter((i) => i.type === "feed")
    .map((i) => Date.parse(i.at))
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b);

  const diapers = items
    .filter((i) => i.type === "diaper")
    .map((i) => ({
      at: Date.parse(i.at),
      kind: diaperKind(i.payload),
    }))
    .filter(
      (d) =>
        Number.isFinite(d.at) &&
        (d.kind === "wet" || d.kind === "dirty" || d.kind === "mixed"),
    )
    .sort((a, b) => a.at - b.at);

  if (feeds.length === 0 || diapers.length === 0) {
    return { emptyReason: "need_more_logs" };
  }

  const lags: number[] = [];
  for (const feedAt of feeds) {
    const next = diapers.find(
      (d) => d.at > feedAt && d.at - feedAt <= maxLagMs,
    );
    if (next) lags.push((next.at - feedAt) / 60_000);
  }

  if (lags.length === 0) {
    return { emptyReason: "need_more_logs" };
  }

  const avg = lags.reduce((a, b) => a + b, 0) / lags.length;
  return { avgLagMinutes: Math.round(avg * 10) / 10 };
}

/**
 * Sleep efficiency needs waking fragments — always soft empty this pass.
 * Never invent % from Night Rest duration.
 */
export function deriveSleepEfficiencyKpi(
  _items: readonly BabyInsightKpiCareItem[],
  _opts: DeriveInsightKpiOptions,
): SleepEfficiencyKpi {
  return { emptyReason: "need_night_waking_logs" };
}

/** Truncation honesty for non-full slices (unit / reuse). */
export function insightKpiPartialFlag(opts: {
  hasMorePages?: boolean;
}): { partial: boolean; completeHistory: boolean } {
  if (opts.hasMorePages) {
    return { partial: true, completeHistory: false };
  }
  return { partial: false, completeHistory: true };
}

/** Local day key helper for trend series (exported for deferred helpers). */
export function insightCareLocalDay(iso: string): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return toLocalDateString(new Date(ms));
}
