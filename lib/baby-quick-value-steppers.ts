import type { BabyFeedGuideBand } from "@/lib/baby-age-guide";

export const BABY_FORMULA_STEP_ML = 10;
export const BABY_FORMULA_HARD_MIN_ML = 10;
export const BABY_FORMULA_HARD_MAX_ML = 300;

export type BabyCustomMlResult =
  | { ok: true; ml: number }
  | { ok: false; reasonKey: string };

function clampToBand(ml: number, band: BabyFeedGuideBand): number {
  return Math.min(band.mlMax, Math.max(band.mlMin, ml));
}

/** Moves by 10 and clamps at band edges — never leaves the band. */
export function stepBabyFormulaMl(
  current: number,
  dir: 1 | -1,
  band: BabyFeedGuideBand,
): number {
  if (current < band.mlMin || current > band.mlMax) {
    return dir > 0 ? band.mlMin : band.mlMax;
  }
  let base = current;
  if (base % BABY_FORMULA_STEP_ML !== 0) {
    base =
      dir > 0
        ? Math.floor(base / BABY_FORMULA_STEP_ML) * BABY_FORMULA_STEP_ML
        : Math.ceil(base / BABY_FORMULA_STEP_ML) * BABY_FORMULA_STEP_ML;
  }
  return clampToBand(base + dir * BABY_FORMULA_STEP_ML, band);
}

/** True only for a value the Custom modal produced (outside the band). */
export function isBabyFormulaCustom(
  ml: number,
  band: BabyFeedGuideBand,
): boolean {
  return ml < band.mlMin || ml > band.mlMax;
}

/** Trims, then accepts only a whole positive number inside the hard bounds. */
export function parseBabyCustomMl(raw: string): BabyCustomMlResult {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: false, reasonKey: "home.customMlInvalid" };
  }
  if (!/^\d+$/.test(trimmed)) {
    if (/^\d+\.\d+$/.test(trimmed)) {
      return { ok: false, reasonKey: "home.customMlWhole" };
    }
    return { ok: false, reasonKey: "home.customMlInvalid" };
  }
  const ml = Number(trimmed);
  if (!Number.isFinite(ml) || ml <= 0) {
    return { ok: false, reasonKey: "home.customMlInvalid" };
  }
  if (ml < BABY_FORMULA_HARD_MIN_ML) {
    return { ok: false, reasonKey: "home.customMlTooLow" };
  }
  if (ml > BABY_FORMULA_HARD_MAX_ML) {
    return { ok: false, reasonKey: "home.customMlTooHigh" };
  }
  return { ok: true, ml };
}
