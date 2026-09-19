/**
 * Growth capture page chips (includes UI-only vaccine sentinel).
 * Do not extend Insights/Activities growth filter chips with these.
 */
export const BABY_GROWTH_PAGE_CHIPS = [
  "vaccine",
  "vitamin",
  "medication",
  "temperature",
  "weight",
  "height",
  "head",
] as const;

export type BabyGrowthPageChip = (typeof BABY_GROWTH_PAGE_CHIPS)[number];

/** Chips that map to baby_growth_kind (vaccine is UI-only). */
export const BABY_GROWTH_PAGE_DB_KINDS = [
  "vitamin",
  "medication",
  "temperature",
  "weight",
  "height",
  "head",
] as const;

export type BabyGrowthPageDbKind = (typeof BABY_GROWTH_PAGE_DB_KINDS)[number];

/** Default chip when opening Growth with no / unknown kind. */
export const BABY_GROWTH_PAGE_DEFAULT_CHIP =
  "weight" as const satisfies BabyGrowthPageChip;

/** Growth capture path without sticky `?kind=` (post-save / default chip). */
export const BABY_GROWTH_CAPTURE_HREF = "/baby/growth" as const;

/** Deep link / redirect target for vaccine capture on Growth. */
export const BABY_VACCINE_CAPTURE_HREF = "/baby/growth?kind=vaccine" as const;

/**
 * Apply `?kind=` only when the param value changes (mount / navigation).
 * Same sticky param after a local Weight reset → null (do not re-apply).
 */
export function babyGrowthChipWhenKindParamChanges(
  previousKindParam: string | null | undefined,
  nextKindParam: string | null,
): BabyGrowthPageChip | null {
  if (previousKindParam === nextKindParam) return null;
  return resolveBabyGrowthPageChipFromKindParam(nextKindParam);
}

export function isBabyGrowthPageChip(
  value: string,
): value is BabyGrowthPageChip {
  return (BABY_GROWTH_PAGE_CHIPS as readonly string[]).includes(value);
}

export function isBabyGrowthPageDbKind(
  value: string,
): value is BabyGrowthPageDbKind {
  return (BABY_GROWTH_PAGE_DB_KINDS as readonly string[]).includes(value);
}

/** Resolve `?kind=` for Growth; unknown / missing → Weight. */
export function resolveBabyGrowthPageChipFromKindParam(
  raw: string | null | undefined,
): BabyGrowthPageChip {
  if (raw && isBabyGrowthPageChip(raw)) return raw;
  return BABY_GROWTH_PAGE_DEFAULT_CHIP;
}

/** Save mutation plane for the selected chip. */
export function babyGrowthSaveMutationTarget(
  chip: BabyGrowthPageChip,
): "vaccine" | "growth" {
  return chip === "vaccine" ? "vaccine" : "growth";
}

/** Query invalidate scope after a successful Growth-page save. */
export function babyGrowthSaveInvalidateScope(
  chip: BabyGrowthPageChip,
): "vaccines" | "growth" {
  return chip === "vaccine" ? "vaccines" : "growth";
}

/** Growth page: chips pick one kind (radio). */
export function selectBabyGrowthPageChip(
  _current: BabyGrowthPageChip,
  next: BabyGrowthPageChip,
): BabyGrowthPageChip {
  return next;
}

/** Default unit when switching measure / temperature kinds. */
export function defaultUnitForGrowthChip(kind: BabyGrowthPageChip): string {
  if (kind === "weight") return "kg";
  if (kind === "height" || kind === "head") return "cm";
  if (kind === "temperature") return "°C";
  return "";
}
