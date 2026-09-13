/** Shared diaper detail enums and home defaults (Option B). */

export const BABY_DIAPER_KINDS = [
  "wet",
  "dirty",
  "mixed",
  "dry",
] as const;

export type BabyDiaperKind = (typeof BABY_DIAPER_KINDS)[number];

export const BABY_DIAPER_COLORS = [
  "yellow",
  "brown",
  "green",
  "black",
  "white_pale",
  "red_bloody",
] as const;

export type BabyDiaperColor = (typeof BABY_DIAPER_COLORS)[number];

export const BABY_DIAPER_TEXTURES = [
  "soft",
  "seedy",
  "mushy",
  "watery",
  "hard",
  "formed",
] as const;

export type BabyDiaperTexture = (typeof BABY_DIAPER_TEXTURES)[number];

export const BABY_DIAPER_AMOUNTS = [
  "smear",
  "medium",
  "blowout",
] as const;

export type BabyDiaperAmount = (typeof BABY_DIAPER_AMOUNTS)[number];

const COLOR_RED_FLAGS = new Set<BabyDiaperColor>([
  "white_pale",
  "red_bloody",
]);

const TEXTURE_CAUTIONS = new Set<BabyDiaperTexture>(["watery", "hard"]);

/** Home quick-care default when Poop/Mixed skip amount. */
export function babyDiaperDefaultAmount(): BabyDiaperAmount {
  return "medium";
}

/** Color / texture / amount only make sense for dirty or mixed. */
export function babyDiaperDetailAllowed(kind: BabyDiaperKind): boolean {
  return kind === "dirty" || kind === "mixed";
}

export function babyDiaperColorIsRedFlag(color: BabyDiaperColor): boolean {
  return COLOR_RED_FLAGS.has(color);
}

export function babyDiaperTextureNeedsCaution(
  texture: BabyDiaperTexture,
): boolean {
  return TEXTURE_CAUTIONS.has(texture);
}

/** Optional chip: press again to clear so Save can omit the field. */
export function toggleOptionalDiaperChip<T extends string>(
  current: T | null,
  next: T,
): T | null {
  return current === next ? null : next;
}
