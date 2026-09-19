import {
  formatBabyDurationLocale,
  type BabyDurationLocale,
} from "@/lib/baby-format-duration";

const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

export type BabyNextDue =
  | { kind: "next"; dueAt: number; remainingMs: number }
  | { kind: "overdue"; dueAt: number; overdueMs: number }
  | { kind: "hidden" };

export type BabyCareIntervalGuide = {
  feedBreastMinMs: number;
  feedFormulaMinMs: number;
  feedDefaultMinMs: number;
  sleepAwakeMinMs: number;
  diaperMinMs: number;
};

/**
 * Frequency bands use the earlier bound of each age range.
 * ageDays >= 1095 holds the 1–3y band. Separate from ml bands in baby-age-guide.
 */
const INTERVAL_BANDS: Array<{
  maxDayExclusive: number;
  guide: BabyCareIntervalGuide;
}> = [
  {
    maxDayExclusive: 31,
    guide: {
      feedBreastMinMs: 2 * HOUR,
      feedFormulaMinMs: 3 * HOUR,
      feedDefaultMinMs: 2 * HOUR,
      sleepAwakeMinMs: 50 * MIN,
      diaperMinMs: 2 * HOUR,
    },
  },
  {
    maxDayExclusive: 61,
    guide: {
      feedBreastMinMs: 2.5 * HOUR,
      feedFormulaMinMs: 2.5 * HOUR,
      feedDefaultMinMs: 2.5 * HOUR,
      sleepAwakeMinMs: 60 * MIN,
      diaperMinMs: 2 * HOUR,
    },
  },
  {
    maxDayExclusive: 91,
    guide: {
      feedBreastMinMs: 2.5 * HOUR,
      feedFormulaMinMs: 2.5 * HOUR,
      feedDefaultMinMs: 2.5 * HOUR,
      sleepAwakeMinMs: 1.5 * HOUR,
      diaperMinMs: 2 * HOUR,
    },
  },
  {
    maxDayExclusive: 152,
    guide: {
      feedBreastMinMs: 3.5 * HOUR,
      feedFormulaMinMs: 3.5 * HOUR,
      feedDefaultMinMs: 3.5 * HOUR,
      sleepAwakeMinMs: 1.5 * HOUR,
      diaperMinMs: 3 * HOUR,
    },
  },
  {
    maxDayExclusive: 183,
    guide: {
      feedBreastMinMs: 4 * HOUR,
      feedFormulaMinMs: 4 * HOUR,
      feedDefaultMinMs: 4 * HOUR,
      sleepAwakeMinMs: 2 * HOUR,
      diaperMinMs: 3 * HOUR,
    },
  },
  {
    maxDayExclusive: 213,
    guide: {
      feedBreastMinMs: 4 * HOUR,
      feedFormulaMinMs: 4 * HOUR,
      feedDefaultMinMs: 4 * HOUR,
      sleepAwakeMinMs: 2 * HOUR,
      diaperMinMs: 3 * HOUR,
    },
  },
  {
    maxDayExclusive: 365,
    guide: {
      feedBreastMinMs: 4 * HOUR,
      feedFormulaMinMs: 4 * HOUR,
      feedDefaultMinMs: 4 * HOUR,
      sleepAwakeMinMs: 3 * HOUR,
      diaperMinMs: 3 * HOUR,
    },
  },
  {
    maxDayExclusive: 1095,
    guide: {
      feedBreastMinMs: 3 * HOUR,
      feedFormulaMinMs: 3 * HOUR,
      feedDefaultMinMs: 3 * HOUR,
      sleepAwakeMinMs: 5 * HOUR,
      diaperMinMs: 4 * HOUR,
    },
  },
];

const HOLD_LAST = INTERVAL_BANDS[INTERVAL_BANDS.length - 1]!.guide;

export function babyCareIntervalGuideForAge(
  ageDays: number | null,
): BabyCareIntervalGuide | null {
  if (ageDays == null) return null;
  if (ageDays >= 1095) return HOLD_LAST;
  for (const row of INTERVAL_BANDS) {
    if (ageDays < row.maxDayExclusive) return row.guide;
  }
  return HOLD_LAST;
}

function feedIntervalMs(
  guide: BabyCareIntervalGuide,
  ageDays: number,
  method: string | null,
): number {
  if (ageDays >= 31) return guide.feedDefaultMinMs;
  if (method === "breast_l" || method === "breast_r") {
    return guide.feedBreastMinMs;
  }
  if (method === "formula") return guide.feedFormulaMinMs;
  // pump, null, unknown → feedDefaultMinMs
  return guide.feedDefaultMinMs;
}

function dueFromAnchor(
  now: number,
  lastAt: number,
  intervalMs: number,
): BabyNextDue {
  const dueAt = lastAt + intervalMs;
  if (now < dueAt) {
    return { kind: "next", dueAt, remainingMs: dueAt - now };
  }
  return { kind: "overdue", dueAt, overdueMs: now - dueAt };
}

export function babyNextFeedDue(input: {
  now: number;
  ageDays: number | null;
  lastFeedAt: number | null;
  lastFeedMethod: "breast_l" | "breast_r" | "formula" | "pump" | "pump_l" | "pump_r" | null | string;
}): BabyNextDue {
  const guide = babyCareIntervalGuideForAge(input.ageDays);
  if (!guide || input.lastFeedAt == null || input.ageDays == null) {
    return { kind: "hidden" };
  }
  const interval = feedIntervalMs(
    guide,
    input.ageDays,
    input.lastFeedMethod,
  );
  return dueFromAnchor(input.now, input.lastFeedAt, interval);
}

export function babyNextSleepDue(input: {
  now: number;
  ageDays: number | null;
  lastSleepEndedAt: number | null;
  napOpen: boolean;
}): BabyNextDue {
  if (input.napOpen) return { kind: "hidden" };
  const guide = babyCareIntervalGuideForAge(input.ageDays);
  if (!guide || input.lastSleepEndedAt == null) return { kind: "hidden" };
  return dueFromAnchor(
    input.now,
    input.lastSleepEndedAt,
    guide.sleepAwakeMinMs,
  );
}

export function babyNextDiaperDue(input: {
  now: number;
  ageDays: number | null;
  lastDiaperAt: number | null;
}): BabyNextDue {
  const guide = babyCareIntervalGuideForAge(input.ageDays);
  if (!guide || input.lastDiaperAt == null) return { kind: "hidden" };
  return dueFromAnchor(input.now, input.lastDiaperAt, guide.diaperMinMs);
}

/** vars must include { duration } — the only interpolation name for both keys */
export function formatBabyNextDueLabel(
  due: BabyNextDue,
  t: (
    key: "home.nextIn" | "home.overdue",
    vars: { duration: string },
  ) => string,
  locale: BabyDurationLocale = "en",
): string | null {
  if (due.kind === "hidden") return null;
  if (due.kind === "next") {
    const duration = formatBabyDurationLocale(due.remainingMs / 1000, locale);
    return t("home.nextIn", { duration });
  }
  const duration = formatBabyDurationLocale(due.overdueMs / 1000, locale);
  return t("home.overdue", { duration });
}
