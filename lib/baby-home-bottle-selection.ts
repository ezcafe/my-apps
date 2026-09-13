import { BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS } from "@/lib/baby-age-guide";

/**
 * Selected bottle chip ml: flash → pending Custom only.
 * Idle never highlights last feed / recent ml.
 */
export function resolveBabyHomeSelectedBottleMl(input: {
  bottleDoneMl: number | null;
  formulaFromCustom: boolean;
  formulaOverride: number | null;
}): number | null {
  if (input.bottleDoneMl != null) return input.bottleDoneMl;
  if (input.formulaFromCustom && input.formulaOverride != null) {
    return input.formulaOverride;
  }
  return null;
}

/**
 * Custom modal seed. No birth → first chip or safe snap (90), never FALLBACK ~120
 * as if it were recommended.
 */
export function babyHomeCustomInitialMl(input: {
  formulaOverride: number | null;
  birthDate: string | null;
  suggestedMl: number;
  firstChipMl: number | null;
}): number {
  if (input.formulaOverride != null) return input.formulaOverride;
  if (input.birthDate != null) return input.suggestedMl;
  return input.firstChipMl ?? BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS[1];
}

/** Keep flash/custom ml visible in the chip row when not yet in history. */
export function ensureMlInBottleChips(
  mls: number[],
  ensureMl: number | null,
  limit = 3,
): number[] {
  if (ensureMl == null || ensureMl <= 0 || mls.includes(ensureMl)) return mls;
  return [ensureMl, ...mls].slice(0, limit);
}
