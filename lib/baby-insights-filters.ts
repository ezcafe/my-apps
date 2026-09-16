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

const CARE_CHIP_IDS = new Set<string>(BABY_INSIGHTS_CARE_CHIPS);
const GROWTH_CHIP_IDS = new Set<string>(BABY_INSIGHTS_GROWTH_CHIPS);

/** Flat ids for one Care-types FilterMenu (care + measures). */
export function mergeBabyInsightsFilterChips(
  chips: BabyInsightsChipSelection,
): string[] {
  return [...chips.careTypes, ...chips.growthKinds];
}

/** Split a combined Care-types selection back into care vs growth. */
export function splitBabyInsightsFilterChips(
  selected: readonly string[],
): BabyInsightsChipSelection {
  const careTypes: BabyInsightsCareChip[] = [];
  const growthKinds: BabyInsightsGrowthChip[] = [];
  for (const id of selected) {
    if (CARE_CHIP_IDS.has(id)) careTypes.push(id as BabyInsightsCareChip);
    else if (GROWTH_CHIP_IDS.has(id))
      growthKinds.push(id as BabyInsightsGrowthChip);
  }
  return { careTypes, growthKinds };
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
 * Option A (independent groups): care chips filter care rows only; growth
 * timeline rows always pass. Empty careTypes → all care types.
 * Prefer {@link filterTimelineByMergedChips} for the unified Care-types menu.
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
 * Independent growth group: empty → all kinds.
 * Prefer {@link filterGrowthByMergedChips} for the unified Care-types menu.
 */
export function filterGrowthByKindChips<T extends { kind: string }>(
  items: T[],
  growthKinds: readonly BabyInsightsGrowthChip[],
): T[] {
  if (growthKinds.length === 0) return items;
  const allowed = new Set<string>(growthKinds);
  return items.filter((item) => allowed.has(item.kind));
}

/** True when the unified Care-types menu has any chip selected. */
export function babyInsightsMergedChipsActive(
  chips: BabyInsightsChipSelection,
): boolean {
  return mergeBabyInsightsFilterChips(chips).length > 0;
}

/**
 * Unified Care-types menu (care + measures in one multi-select).
 * Empty selection → all rows. Otherwise each selected id is exclusive:
 * Diaper alone must not keep Head / other growth rows.
 */
export function filterTimelineByMergedChips<T extends BabyInsightsTimelineRow>(
  items: T[],
  chips: BabyInsightsChipSelection,
): T[] {
  if (!babyInsightsMergedChipsActive(chips)) return items;
  const care = new Set<string>(chips.careTypes);
  const growth = new Set<string>(chips.growthKinds);
  return items.filter((item) => {
    if (item.kind === "growth") return growth.has(item.type);
    return care.has(item.type);
  });
}

/** Same merged exclusivity for growth list / chart source rows. */
export function filterGrowthByMergedChips<T extends { kind: string }>(
  items: T[],
  chips: BabyInsightsChipSelection,
): T[] {
  if (!babyInsightsMergedChipsActive(chips)) return items;
  const allowed = new Set<string>(chips.growthKinds);
  return items.filter((item) => allowed.has(item.kind));
}

/** Growth chart card visible under merged Care-types selection. */
export function growthKindVisibleInMergedChips(
  kind: BabyInsightsGrowthChip,
  chips: BabyInsightsChipSelection,
): boolean {
  if (!babyInsightsMergedChipsActive(chips)) return true;
  return chips.growthKinds.includes(kind);
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
