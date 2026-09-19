import type { ActivityLogRow } from "@/lib/baby-insights-activity-log";
import {
  babyActivityAccentFamily,
  type BabyActivityAccentFamily,
} from "@/lib/baby-activity-color";
import {
  babyFeedGuideForAge,
  babySleepGuideForAge,
} from "@/lib/baby-age-guide";

export type BabyActivityBorderCue = "below" | "near" | "above" | "none";

export type BabyActivityRegularCue = {
  family: BabyActivityAccentFamily;
  border: BabyActivityBorderCue;
  /**
   * Accent bar fill vs age midpoint (0–1). null = full bar / type-only.
   * Example: logged 30 min, expected mid 60 → 0.5.
   */
  fillRatio: number | null;
};

function compareToBand(
  value: number,
  min: number,
  max: number,
): Exclude<BabyActivityBorderCue, "none"> {
  if (value < min) return "below";
  if (value > max) return "above";
  return "near";
}

/** Midpoint of a min–max band; used as “expected” for fill ratio. */
export function babyActivityExpectedMid(min: number, max: number): number {
  return (min + max) / 2;
}

/** logged / expected, clamped to [0, 1]. */
export function babyActivityFillRatio(
  logged: number,
  expected: number,
): number {
  if (!(expected > 0) || !Number.isFinite(logged) || logged < 0) return 0;
  return Math.min(1, logged / expected);
}

function amountMlFromPayload(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as {
    amountMl?: unknown;
    legs?: Array<{ amountMl?: unknown; method?: unknown }>;
  };
  if (typeof p.amountMl === "number" && Number.isFinite(p.amountMl)) {
    return p.amountMl;
  }
  const pumpLeg = p.legs?.find(
    (l) =>
      (l.method === "pump" ||
        l.method === "pump_l" ||
        l.method === "pump_r" ||
        l.method === "formula") &&
      typeof l.amountMl === "number",
  );
  return typeof pumpLeg?.amountMl === "number" ? pumpLeg.amountMl : null;
}

function durationSecFromPayload(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { durationSec?: unknown };
  return typeof p.durationSec === "number" && Number.isFinite(p.durationSec)
    ? p.durationSec
    : null;
}

function sleepDurationMin(row: Pick<ActivityLogRow, "at" | "endedAt">): number | null {
  if (!row.endedAt) return null;
  const start = Date.parse(row.at);
  const end = Date.parse(row.endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return Math.max(1, Math.round((end - start) / 60_000));
}

function cueWithMetric(
  family: BabyActivityAccentFamily,
  value: number,
  min: number,
  max: number,
): BabyActivityRegularCue {
  const expected = babyActivityExpectedMid(min, max);
  return {
    family,
    border: compareToBand(value, min, max),
    fillRatio: babyActivityFillRatio(value, expected),
  };
}

/**
 * Pure: accent family + below/near/above border vs age-regular + fill ratio.
 * Unknown age or no metric → border `none`, fillRatio null (full bar).
 */
export function babyActivityRegularCue(
  row: Pick<
    ActivityLogRow,
    "source" | "careType" | "growthKind" | "payload" | "at" | "endedAt"
  >,
  ageDays: number | null,
): BabyActivityRegularCue {
  const family = babyActivityAccentFamily(row);
  if (ageDays == null) {
    return { family, border: "none", fillRatio: null };
  }

  if (row.source === "care" && row.careType === "sleep") {
    const mins = sleepDurationMin(row);
    const band = babySleepGuideForAge(ageDays);
    if (mins == null || !band) {
      return { family, border: "none", fillRatio: null };
    }
    return cueWithMetric(family, mins, band.napMinMin, band.napMaxMin);
  }

  if (row.source === "care" && row.careType === "feed") {
    const ml = amountMlFromPayload(row.payload);
    if (ml != null && ml > 0) {
      const band = babyFeedGuideForAge(ageDays);
      return cueWithMetric(family, ml, band.mlMin, band.mlMax);
    }
    const durationSec = durationSecFromPayload(row.payload);
    const sleepBand = babySleepGuideForAge(ageDays);
    if (durationSec != null && sleepBand) {
      const mins = Math.max(1, Math.round(durationSec / 60));
      return cueWithMetric(
        family,
        mins,
        sleepBand.napMinMin,
        sleepBand.napMaxMin,
      );
    }
    return { family, border: "none", fillRatio: null };
  }

  if (row.source === "growth" && row.growthKind === "pump") {
    const payload = row.payload as { valueNum?: number | null } | undefined;
    const ml = payload?.valueNum;
    if (typeof ml === "number" && ml > 0) {
      const band = babyFeedGuideForAge(ageDays);
      return cueWithMetric(family, ml, band.mlMin, band.mlMax);
    }
  }

  return { family, border: "none", fillRatio: null };
}
