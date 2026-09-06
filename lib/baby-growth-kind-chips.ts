import type { BabyInsightsGrowthChip } from "@/lib/baby-insights-filters";
import { BABY_INSIGHTS_GROWTH_CHIPS } from "@/lib/baby-insights-filters";

export { BABY_INSIGHTS_GROWTH_CHIPS as BABY_GROWTH_KIND_CHIPS };
export type BabyGrowthKindChip = BabyInsightsGrowthChip;

/** Measure page: chips pick one kind (radio). Clicking the same kind keeps it. */
export function selectBabyGrowthKindChip(
  current: BabyGrowthKindChip,
  next: BabyGrowthKindChip,
): BabyGrowthKindChip {
  return next;
}

export function isBabyGrowthKindChip(
  value: string,
): value is BabyGrowthKindChip {
  return (BABY_INSIGHTS_GROWTH_CHIPS as readonly string[]).includes(value);
}

/** Keeps full row shape (id, valueNum, …) — only filters by kind. */
export function babyMeasureKindFilter<T extends { kind: string }>(
  entries: readonly T[],
  kind: BabyGrowthKindChip,
): T[] {
  return entries.filter((e) => e.kind === kind);
}
