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
 * Custom tile stays selected while pending Custom ml or during
 * custom-origin Done flash (keep *FromCustom until flash clears).
 */
export function resolveBabyHomeCustomSelected(input: {
  fromCustom: boolean;
  override: number | null;
  doneMl: number | null;
}): boolean {
  if (!input.fromCustom) return false;
  return input.override != null || input.doneMl != null;
}

/**
 * After a custom-origin amount save, keep fromCustom for the flash window.
 */
export function babyHomeKeepFromCustomAfterAmountSuccess(input: {
  fromCustom: boolean;
  doneMl: number | null;
}): boolean {
  return Boolean(input.fromCustom && input.doneMl != null);
}

/**
 * Custom ml tile tap: save pending vs open modal for first pick.
 * Edit is a separate control (outside the 2×2).
 */
export function babyHomeCustomMlTapAction(input: {
  fromCustom: boolean;
  override: number | null;
}): "save" | "open" {
  if (input.fromCustom && input.override != null) return "save";
  return "open";
}

/** Edit affordance: reopen modal seeded with current override. */
export function babyHomeCustomMlEditAction(input: {
  fromCustom: boolean;
  override: number | null;
}): "edit" | "noop" {
  if (input.fromCustom && input.override != null) return "edit";
  // Still open so caregiver can set a custom amount from Edit.
  return "edit";
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
