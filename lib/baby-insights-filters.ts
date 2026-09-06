/** Care types shown as Insights chips (timeline filter). */
export const BABY_INSIGHTS_CARE_CHIPS = ["feed", "sleep", "diaper"] as const;
export type BabyInsightsCareChip = (typeof BABY_INSIGHTS_CARE_CHIPS)[number];

/** Growth kinds shown as Insights chips (chart / list filter). */
export const BABY_INSIGHTS_GROWTH_CHIPS = [
  "weight",
  "height",
  "head",
  "temperature",
  "medication",
] as const;
export type BabyInsightsGrowthChip =
  (typeof BABY_INSIGHTS_GROWTH_CHIPS)[number];

export type BabyInsightsChipSelection = {
  careTypes: BabyInsightsCareChip[];
  growthKinds: BabyInsightsGrowthChip[];
};

/** Empty selection means “all” for that group. */
export function emptyBabyInsightsChips(): BabyInsightsChipSelection {
  return { careTypes: [], growthKinds: [] };
}

export function toggleBabyInsightsCareChip(
  selected: BabyInsightsCareChip[],
  chip: BabyInsightsCareChip,
): BabyInsightsCareChip[] {
  return selected.includes(chip)
    ? selected.filter((c) => c !== chip)
    : [...selected, chip];
}

export function toggleBabyInsightsGrowthChip(
  selected: BabyInsightsGrowthChip[],
  chip: BabyInsightsGrowthChip,
): BabyInsightsGrowthChip[] {
  return selected.includes(chip)
    ? selected.filter((c) => c !== chip)
    : [...selected, chip];
}

export type BabyInsightsTimelineRow = {
  kind: string;
  type: string;
};

/**
 * Option A: care chips filter care rows only; growth timeline rows always pass.
 * Empty careTypes → all care types.
 */
export function filterTimelineByCareChips<T extends BabyInsightsTimelineRow>(
  items: T[],
  careTypes: readonly BabyInsightsCareChip[],
): T[] {
  if (careTypes.length === 0) return items;
  const allowed = new Set<string>(careTypes);
  return items.filter((item) => {
    if (item.kind === "growth") return true;
    return allowed.has(item.type);
  });
}

/**
 * Growth chips filter chart / measurement list. Empty → all kinds.
 */
export function filterGrowthByKindChips<T extends { kind: string }>(
  items: T[],
  growthKinds: readonly BabyInsightsGrowthChip[],
): T[] {
  if (growthKinds.length === 0) return items;
  const allowed = new Set<string>(growthKinds);
  return items.filter((item) => allowed.has(item.kind));
}

export type BabyInsightsFilterState = {
  fromDate: string;
  toDate: string;
  chips: BabyInsightsChipSelection;
};

export function babyInsightsFiltersDirty(
  draft: BabyInsightsFilterState,
  applied: BabyInsightsFilterState,
): boolean {
  if (draft.fromDate !== applied.fromDate || draft.toDate !== applied.toDate) {
    return true;
  }
  if (
    draft.chips.careTypes.length !== applied.chips.careTypes.length ||
    draft.chips.growthKinds.length !== applied.chips.growthKinds.length
  ) {
    return true;
  }
  const careOk = draft.chips.careTypes.every((c) =>
    applied.chips.careTypes.includes(c),
  );
  const growthOk = draft.chips.growthKinds.every((c) =>
    applied.chips.growthKinds.includes(c),
  );
  return !(careOk && growthOk);
}
