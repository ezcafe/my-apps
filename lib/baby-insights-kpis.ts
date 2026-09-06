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
