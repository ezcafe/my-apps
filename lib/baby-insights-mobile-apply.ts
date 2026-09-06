/**
 * Growth kind chips sit outside the filter bar (Care is inside, like Money Accounts).
 * Show Apply near growth chips only when growth selection is dirty.
 */
export function babyInsightsShowChipApplyRow(opts: {
  growthKindsDirty: boolean;
}): boolean {
  return opts.growthKindsDirty;
}

export function babyInsightsGrowthKindsDirty(
  draftKinds: readonly string[],
  appliedKinds: readonly string[],
): boolean {
  if (draftKinds.length !== appliedKinds.length) return true;
  return !draftKinds.every((k) => appliedKinds.includes(k));
}
