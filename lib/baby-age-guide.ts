import {
  babyCalendarDayNumber,
  parseBabyCalendarDate,
} from "@/lib/baby-calendar-date";

/** Caregiver guide band — not medical advice. */
export type BabyFeedGuideBand = {
  labelKey: string;
  mlMin: number;
  mlMax: number;
  feedsMin: number;
  /** The N in "n/N today". Infinity when unset (fallback). */
  feedsMax: number;
};

/** No birthDate → stopgap so the page stays usable. */
export const BABY_FEED_GUIDE_FALLBACK: BabyFeedGuideBand = {
  labelKey: "guide.fallback",
  mlMin: 60,
  mlMax: 150,
  feedsMin: 0,
  feedsMax: Number.POSITIVE_INFINITY,
};

/**
 * Upper day bound (inclusive) → band.
 * ageDays 0 on birth calendar day. Caregiver “1–2 days” → 0–2.
 * Post-12mo bands kept so toddlers do not jump to newborn ml.
 */
const FEED_GUIDE_BANDS: Array<{ maxDay: number; band: BabyFeedGuideBand }> = [
  {
    maxDay: 2,
    band: {
      labelKey: "guide.band0to2Days",
      mlMin: 5,
      mlMax: 15,
      feedsMin: 8,
      feedsMax: 12,
    },
  },
  {
    maxDay: 7,
    band: {
      labelKey: "guide.band3to7Days",
      mlMin: 30,
      mlMax: 60,
      feedsMin: 8,
      feedsMax: 12,
    },
  },
  {
    maxDay: 28,
    band: {
      labelKey: "guide.band1to4Weeks",
      mlMin: 60,
      mlMax: 90,
      feedsMin: 6,
      feedsMax: 8,
    },
  },
  {
    maxDay: 91,
    band: {
      labelKey: "guide.band1to3Months",
      mlMin: 90,
      mlMax: 150,
      feedsMin: 6,
      feedsMax: 8,
    },
  },
  {
    maxDay: 183,
    band: {
      labelKey: "guide.band3to6Months",
      mlMin: 120,
      mlMax: 180,
      feedsMin: 5,
      feedsMax: 6,
    },
  },
  {
    maxDay: 365,
    band: {
      labelKey: "guide.band6to12Months",
      mlMin: 180,
      mlMax: 240,
      feedsMin: 3,
      feedsMax: 4,
    },
  },
  {
    maxDay: 548,
    band: {
      labelKey: "guide.band12to18Months",
      mlMin: 120,
      mlMax: 180,
      feedsMin: 2,
      feedsMax: 3,
    },
  },
  {
    maxDay: 730,
    band: {
      labelKey: "guide.band18to24Months",
      mlMin: 120,
      mlMax: 180,
      feedsMin: 1,
      feedsMax: 2,
    },
  },
  {
    maxDay: Number.POSITIVE_INFINITY,
    band: {
      labelKey: "guide.bandOver24Months",
      mlMin: 120,
      mlMax: 180,
      feedsMin: 1,
      feedsMax: 2,
    },
  },
];

/**
 * Whole LOCAL calendar days between birthday and today in the caregiver's
 * timezone. Returns null for missing, malformed, impossible, or future dates.
 */
export function babyAgeInDays(
  birthDate: string | null,
  now: Date,
): number | null {
  const born = parseBabyCalendarDate(birthDate);
  if (!born) return null;
  const today = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
  const days = babyCalendarDayNumber(today) - babyCalendarDayNumber(born);
  return days < 0 ? null : days;
}

export function babyFeedGuideForAge(
  ageDays: number | null,
): BabyFeedGuideBand {
  if (ageDays == null) return BABY_FEED_GUIDE_FALLBACK;
  for (const row of FEED_GUIDE_BANDS) {
    if (ageDays <= row.maxDay) return row.band;
  }
  return FEED_GUIDE_BANDS[FEED_GUIDE_BANDS.length - 1]!.band;
}

export function babyFormulaSnapList(band: BabyFeedGuideBand): number[] {
  const out: number[] = [];
  for (let ml = band.mlMin; ml <= band.mlMax; ml += 10) {
    out.push(ml);
  }
  return out;
}

/** Mid-band value rounded to 10 and clamped inside the band. */
export function babyFormulaDefaultMl(band: BabyFeedGuideBand): number {
  if (band === BABY_FEED_GUIDE_FALLBACK) return 120;
  const mid = (band.mlMin + band.mlMax) / 2;
  const rounded = Math.round(mid / 10) * 10;
  return Math.min(band.mlMax, Math.max(band.mlMin, rounded));
}

const WEIGHT_ML_UNDER_6MO_DAYS = 183;
const WEIGHT_ML_MULTIPLIER = 150;

function round10(n: number): number {
  return Math.round(n / 10) * 10;
}

/**
 * Suggested bottle ml: mid-band default, or weight×150÷feedsDayMid under 6 mo
 * when weightKg is present. Guidelines only — not medical advice.
 */
export function babySuggestedBottleMl(input: {
  ageDays: number | null;
  weightKg?: number | null;
}): number {
  const band = babyFeedGuideForAge(input.ageDays);
  const midDefault = babyFormulaDefaultMl(band);
  const weightKg = input.weightKg;
  if (
    weightKg == null ||
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    input.ageDays == null ||
    input.ageDays >= WEIGHT_ML_UNDER_6MO_DAYS ||
    !Number.isFinite(band.feedsMax)
  ) {
    return midDefault;
  }
  const feedsDayMid = (band.feedsMin + band.feedsMax) / 2;
  if (feedsDayMid <= 0) return midDefault;
  const raw = (weightKg * WEIGHT_ML_MULTIPLIER) / feedsDayMid;
  const rounded = round10(raw);
  return Math.min(band.mlMax, Math.max(band.mlMin, rounded));
}

/** Caregiver sleep blend — not medical advice. */
export type BabySleepGuideBand = {
  labelKey: string;
  /** i18n key for one-line nap header blend (EN + VI). */
  blendKey: string;
  /** Soft nap duration window (minutes) for Activities border cues — not medical. */
  napMinMin: number;
  napMaxMin: number;
};

/**
 * Inclusive maxDay → sleep blend. ageDays 0 on birth day.
 * Past 1–3y keeps the last toddler band (no null / label-only).
 */
const SLEEP_GUIDE_BANDS: Array<{ maxDay: number; band: BabySleepGuideBand }> = [
  {
    maxDay: 30,
    band: {
      labelKey: "guide.sleep0to1Mo",
      blendKey: "home.header.nap.blend0to1Mo",
      napMinMin: 20,
      napMaxMin: 120,
    },
  },
  {
    maxDay: 60,
    band: {
      labelKey: "guide.sleep1to2Mo",
      blendKey: "home.header.nap.blend1to2Mo",
      napMinMin: 20,
      napMaxMin: 120,
    },
  },
  {
    maxDay: 122,
    band: {
      labelKey: "guide.sleep3to4Mo",
      blendKey: "home.header.nap.blend3to4Mo",
      napMinMin: 30,
      napMaxMin: 120,
    },
  },
  {
    maxDay: 183,
    band: {
      labelKey: "guide.sleep5to6Mo",
      blendKey: "home.header.nap.blend5to6Mo",
      napMinMin: 30,
      napMaxMin: 120,
    },
  },
  {
    maxDay: 365,
    band: {
      labelKey: "guide.sleep7to12Mo",
      blendKey: "home.header.nap.blend7to12Mo",
      napMinMin: 45,
      napMaxMin: 120,
    },
  },
  {
    maxDay: 1095,
    band: {
      labelKey: "guide.sleep1to3Y",
      blendKey: "home.header.nap.blend1to3Y",
      napMinMin: 60,
      napMaxMin: 180,
    },
  },
];

/** null age → no fake nap blend. Past toddler → keep last band. */
export function babySleepGuideForAge(
  ageDays: number | null,
): BabySleepGuideBand | null {
  if (ageDays == null) return null;
  for (const row of SLEEP_GUIDE_BANDS) {
    if (ageDays <= row.maxDay) return row.band;
  }
  return SLEEP_GUIDE_BANDS[SLEEP_GUIDE_BANDS.length - 1]!.band;
}

/** Average month length — floor months for home title age. */
export function babyAgeInMonthsFloor(ageDays: number): number {
  return Math.floor(ageDays / 30.4375);
}

/**
 * Care-guide stage cuts (same as guideline titles):
 * newborn 0–30 · m1_3 31–90 · m3_6 91–182 · m6_12 183–364 · m12_24 ≥365.
 * null age → null (no diaper/pump tip).
 */
export function babyCareGuideStageForAge(
  ageDays: number | null,
): "newborn" | "m1_3" | "m3_6" | "m6_12" | "m12_24" | null {
  if (ageDays == null || ageDays < 0) return null;
  if (ageDays <= 30) return "newborn";
  if (ageDays <= 90) return "m1_3";
  if (ageDays <= 182) return "m3_6";
  if (ageDays <= 364) return "m6_12";
  return "m12_24";
}

/**
 * Fixed safe snaps when birthday unset — usability only, never “recommended”.
 */
export const BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS = [60, 90, 120] as const;

/**
 * History first (distinct), then snaps skipping duplicates. Max `limit` (default 3).
 */
export function buildBabyBottleChipMls(input: {
  recentBottleMl: number[];
  snaps: number[];
  limit?: number;
}): number[] {
  const limit = input.limit ?? 3;
  const out: number[] = [];
  const seen = new Set<number>();

  function push(ml: number) {
    if (!Number.isFinite(ml) || ml <= 0) return;
    if (seen.has(ml)) return;
    if (out.length >= limit) return;
    seen.add(ml);
    out.push(ml);
  }

  for (const ml of input.recentBottleMl) push(ml);
  for (const ml of input.snaps) push(ml);
  return out;
}
