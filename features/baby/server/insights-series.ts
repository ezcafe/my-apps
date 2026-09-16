import { and, asc, desc, eq, gte, lte, lt } from "drizzle-orm";
import { db } from "@/db";
import { babyCareEvent } from "@/db/schema/baby";
import {
  aggregateSeriesCareCounts,
  type SeriesCareCounts,
} from "@/lib/baby-care-counts";
import {
  deriveAwakeWindowTrendSeries,
  deriveDiaperOutputSeries,
  derivePatternFinderSeries,
} from "@/lib/baby-insights-deferred-series";
import { deriveHydrationSeries } from "@/lib/baby-insights-hydration";
import {
  deriveMilkToDiaperLagKpi,
  deriveSleepEfficiencyKpi,
  deriveWakeWindowKpi,
} from "@/lib/baby-insights-insight-kpis";
import { deriveNightRestSeries } from "@/lib/baby-insights-night-rest";
import { toLocalDateString } from "@/lib/money-date-calendar";
import { parseOrThrow } from "@/lib/parse-or-throw";
import { babyInsightsSeriesInputSchema } from "@/lib/validators/baby";

/** Max inclusive span for series scans (~3 months). */
export const BABY_INSIGHTS_SERIES_MAX_DAYS = 93;

export type BabyInsightsSeriesCareRow = {
  type: string;
  at: string;
  endedAt: string | null;
  payload: unknown;
};

export type BabyInsightsSeriesResult = {
  hydration: ReturnType<typeof deriveHydrationSeries>;
  nightRest: ReturnType<typeof deriveNightRestSeries>;
  wakeWindow: ReturnType<typeof deriveWakeWindowKpi>;
  milkToDiaper: ReturnType<typeof deriveMilkToDiaperLagKpi>;
  sleepEfficiency: ReturnType<typeof deriveSleepEfficiencyKpi>;
  patternFinder: ReturnType<typeof derivePatternFinderSeries>;
  awakeTrend: ReturnType<typeof deriveAwakeWindowTrendSeries>;
  diaperOutput: ReturnType<typeof deriveDiaperOutputSeries>;
  /** Full-range care totals + by-day buckets for More insights count KPIs / care-count. */
  counts: Pick<SeriesCareCounts, "feeds" | "sleep" | "diapers">;
  careCountDays: SeriesCareCounts["days"];
};

export function assertBabyInsightsSeriesRangeSpan(
  fromMs: number,
  toMs: number,
): void {
  const days = (toMs - fromMs) / 86_400_000;
  if (days > BABY_INSIGHTS_SERIES_MAX_DAYS) {
    throw new Error(
      `Validation failed: range exceeds ${BABY_INSIGHTS_SERIES_MAX_DAYS} days`,
    );
  }
}

/** Pure: shared helpers on full-range care items (hasMorePages false). */
export function buildBabyInsightsSeriesFromItems(
  items: readonly BabyInsightsSeriesCareRow[],
  fromDate: string,
  toDate: string,
): BabyInsightsSeriesResult {
  const rangeOpts = { fromDate, toDate };
  const careCounts = aggregateSeriesCareCounts(items, fromDate, toDate);
  return {
    hydration: deriveHydrationSeries(items, {
      ...rangeOpts,
      hasMorePages: false,
    }),
    nightRest: deriveNightRestSeries(items, rangeOpts),
    wakeWindow: deriveWakeWindowKpi(items, rangeOpts),
    milkToDiaper: deriveMilkToDiaperLagKpi(items, {
      ...rangeOpts,
      maxLagHours: 6,
    }),
    sleepEfficiency: deriveSleepEfficiencyKpi(items, rangeOpts),
    patternFinder: derivePatternFinderSeries(items, rangeOpts),
    awakeTrend: deriveAwakeWindowTrendSeries(items, {
      ...rangeOpts,
      rollingDays: 7,
    }),
    diaperOutput: deriveDiaperOutputSeries(items, rangeOpts),
    counts: {
      feeds: careCounts.feeds,
      sleep: careCounts.sleep,
      diapers: careCounts.diapers,
    },
    careCountDays: careCounts.days,
  };
}

/**
 * Care scan lower bound for Insights series.
 * Extends before applied `from` to the first day’s night-window open
 * ([D−1 19:00, D 08:00)) so multi-block evening sleeps are not dropped.
 */
export function babyInsightsSeriesCareLoadFrom(
  rangeFrom: Date,
  fromDate: string,
  nightStartHour = 19,
): Date {
  const [y, m, d] = fromDate.split("-").map(Number);
  if (!y || !m || !d) return rangeFrom;
  const dayStart = new Date(y, m - 1, d);
  const prev = new Date(dayStart);
  prev.setDate(prev.getDate() - 1);
  const nightStart = new Date(
    prev.getFullYear(),
    prev.getMonth(),
    prev.getDate(),
    nightStartHour,
    0,
    0,
    0,
  );
  return nightStart.getTime() < rangeFrom.getTime() ? nightStart : rangeFrom;
}

/**
 * Load care events from night-window lookback through `to`
 * (+ one prior completed sleep before lookback for wake gaps)
 * and run shared derive helpers. Workspace-scoped.
 */
export async function getBabyInsightsSeries(
  workspaceId: string,
  raw: { from: string; to: string },
): Promise<BabyInsightsSeriesResult> {
  const input = parseOrThrow(babyInsightsSeriesInputSchema, raw);
  const fromMs = Date.parse(input.from);
  const toMs = Date.parse(input.to);
  assertBabyInsightsSeriesRangeSpan(fromMs, toMs);

  const fromDate = toLocalDateString(new Date(fromMs));
  const toDate = toLocalDateString(new Date(toMs));
  const from = new Date(input.from);
  const to = new Date(input.to);
  const loadFrom = babyInsightsSeriesCareLoadFrom(from, fromDate);

  // Range scan + prior-sleep are independent — run in parallel.
  const [rows, prior] = await Promise.all([
    db
      .select({
        type: babyCareEvent.type,
        occurredAt: babyCareEvent.occurredAt,
        endedAt: babyCareEvent.endedAt,
        payload: babyCareEvent.payload,
      })
      .from(babyCareEvent)
      .where(
        and(
          eq(babyCareEvent.workspaceId, workspaceId),
          gte(babyCareEvent.occurredAt, loadFrom),
          lte(babyCareEvent.occurredAt, to),
        ),
      )
      .orderBy(asc(babyCareEvent.occurredAt), asc(babyCareEvent.id)),
    // One prior completed sleep before night lookback for wake-window first gap
    db
      .select({
        type: babyCareEvent.type,
        occurredAt: babyCareEvent.occurredAt,
        endedAt: babyCareEvent.endedAt,
        payload: babyCareEvent.payload,
      })
      .from(babyCareEvent)
      .where(
        and(
          eq(babyCareEvent.workspaceId, workspaceId),
          eq(babyCareEvent.type, "sleep"),
          lt(babyCareEvent.occurredAt, loadFrom),
        ),
      )
      .orderBy(desc(babyCareEvent.occurredAt), desc(babyCareEvent.id))
      .limit(5),
  ]);

  const priorCompleted = prior.find((r) => r.endedAt != null);

  const items: BabyInsightsSeriesCareRow[] = [];
  if (priorCompleted) {
    items.push({
      type: priorCompleted.type,
      at: priorCompleted.occurredAt.toISOString(),
      endedAt: priorCompleted.endedAt!.toISOString(),
      payload: priorCompleted.payload,
    });
  }
  for (const r of rows) {
    items.push({
      type: r.type,
      at: r.occurredAt.toISOString(),
      endedAt: r.endedAt?.toISOString() ?? null,
      payload: r.payload,
    });
  }

  return buildBabyInsightsSeriesFromItems(items, fromDate, toDate);
}
