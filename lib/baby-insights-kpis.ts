import type { BabyInsightsCareChip } from "@/lib/baby-insights-filters";

export type BabyInsightsKpiSource = {
  timeline: Array<{ kind: string; type: string }>;
  growth: Array<{ kind: string; valueNum: number | null; unit: string | null }>;
};

export type BabyInsightsKpis = {
  feeds: number;
  sleep: number;
  diapers: number;
  /** Latest weight value in list order (newest first), or null. */
  latestWeight: { valueNum: number; unit: string | null } | null;
};

/**
 * Honest counts from already-fetched range data.
 * Care counts use care events only; latest weight from growth rows.
 * Kept for unit tests of timeline-derived KPI math; Insights production
 * uses preferSeriesInsightCountKpis (series-only after Activities move).
 */
export function deriveBabyInsightsKpis(
  source: BabyInsightsKpiSource,
  careTypes: readonly BabyInsightsCareChip[] = [],
): BabyInsightsKpis {
  const careFilter =
    careTypes.length === 0
      ? null
      : new Set<string>(careTypes);

  let feeds = 0;
  let sleep = 0;
  let diapers = 0;
  for (const item of source.timeline) {
    if (item.kind !== "care") continue;
    if (careFilter && !careFilter.has(item.type)) continue;
    if (item.type === "feed") feeds += 1;
    else if (item.type === "sleep") sleep += 1;
    else if (item.type === "diaper") diapers += 1;
  }

  const weight = source.growth.find(
    (g) => g.kind === "weight" && g.valueNum != null,
  );

  return {
    feeds,
    sleep,
    diapers,
    latestWeight:
      weight && weight.valueNum != null
        ? { valueNum: weight.valueNum, unit: weight.unit }
        : null,
  };
}

export type SeriesCountTotals = {
  feeds: number;
  sleep: number;
  diapers: number;
};

/**
 * Prefer full-range series totals for More insights count KPIs.
 * Apply care chips; latest weight still comes from growth lists when loaded.
 * Series-only: missing series does **not** count from a timeline list fallback.
 */
export function preferSeriesInsightCountKpis(opts: {
  seriesCounts: SeriesCountTotals | null | undefined;
  careTypes?: readonly BabyInsightsCareChip[];
  /** Growth pages when More insights (or Activities) has loaded them. */
  growth?: BabyInsightsKpiSource["growth"];
}): BabyInsightsKpis {
  const careTypes = opts.careTypes ?? [];
  const growth = opts.growth ?? [];
  const set =
    careTypes.length === 0 ? null : new Set<string>(careTypes);
  const weight = growth.find(
    (g) => g.kind === "weight" && g.valueNum != null,
  );
  const latestWeight =
    weight && weight.valueNum != null
      ? { valueNum: weight.valueNum, unit: weight.unit }
      : null;

  if (opts.seriesCounts) {
    return {
      feeds: !set || set.has("feed") ? opts.seriesCounts.feeds : 0,
      sleep: !set || set.has("sleep") ? opts.seriesCounts.sleep : 0,
      diapers: !set || set.has("diaper") ? opts.seriesCounts.diapers : 0,
      latestWeight,
    };
  }

  return {
    feeds: 0,
    sleep: 0,
    diapers: 0,
    latestWeight,
  };
}
