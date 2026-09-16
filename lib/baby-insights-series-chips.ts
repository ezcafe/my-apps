import type { BabyInsightsCareChip } from "@/lib/baby-insights-filters";

/** Empty careTypes → all care types allowed (Option A). */
export function careChipAllows(
  careTypes: readonly BabyInsightsCareChip[],
  type: BabyInsightsCareChip,
): boolean {
  return careTypes.length === 0 || careTypes.includes(type);
}

export type HydrationDayForChips = {
  date: string;
  wetCount: number;
  feedCount: number;
  formulaMl?: number | null;
};

/**
 * Apply care chips to Hydration Monitor days.
 * Sleep-only selection → empty (hydration is wet + feeds).
 */
export function filterHydrationDaysByCareChips<T extends HydrationDayForChips>(
  days: readonly T[],
  careTypes: readonly BabyInsightsCareChip[],
): T[] {
  if (careTypes.length === 0) return [...days];
  const allowFeed = careChipAllows(careTypes, "feed");
  const allowDiaper = careChipAllows(careTypes, "diaper");
  if (!allowFeed && !allowDiaper) return [];

  return days
    .map((d) => ({
      ...d,
      wetCount: allowDiaper ? d.wetCount : 0,
      feedCount: allowFeed ? d.feedCount : 0,
      formulaMl: allowFeed ? d.formulaMl : null,
    }))
    .filter(
      (d) =>
        d.wetCount > 0 || d.feedCount > 0 || (d.formulaMl ?? 0) > 0,
    );
}

export type NightRestDayForChips = {
  date: string;
  nightSleepMinutes: number;
  intervalCount: number;
};

/** Night Rest is sleep-only — hide when care chips exclude sleep. */
export function filterNightRestDaysByCareChips<T extends NightRestDayForChips>(
  days: readonly T[],
  careTypes: readonly BabyInsightsCareChip[],
): T[] {
  if (careTypes.length === 0) return [...days];
  if (!careChipAllows(careTypes, "sleep")) return [];
  return [...days];
}

export type CareCountDayForChips = {
  day: string;
  feed: number;
  sleep: number;
  diaper: number;
};

/** Zero out care-count series the chips exclude; drop all-zero days. */
export function filterCareCountDaysByCareChips<T extends CareCountDayForChips>(
  days: readonly T[],
  careTypes: readonly BabyInsightsCareChip[],
): T[] {
  if (careTypes.length === 0) return [...days];
  return days
    .map((d) => ({
      ...d,
      feed: careChipAllows(careTypes, "feed") ? d.feed : 0,
      sleep: careChipAllows(careTypes, "sleep") ? d.sleep : 0,
      diaper: careChipAllows(careTypes, "diaper") ? d.diaper : 0,
    }))
    .filter((d) => d.feed + d.sleep + d.diaper > 0);
}

/** Soft-empty when chips exclude the series’ care type(s). */
export function seriesChartVisibleForCareChips(
  careTypes: readonly BabyInsightsCareChip[],
  needed: readonly BabyInsightsCareChip[],
): boolean {
  if (careTypes.length === 0) return true;
  return needed.some((t) => careTypes.includes(t));
}
