import { BABY_BREAST_TIMER_STALE_MS } from "@/lib/baby-breast-timer-store";

/** Post-stop bottle add-on window (Gate 1 1A + grace). */
export const BABY_FEED_POST_STOP_GRACE_MS = 5 * 60 * 1000;

/** Server skew: accept if client still in grace and delta ≤ 6 min. */
export const BABY_FEED_POST_STOP_GRACE_SKEW_MS = 6 * 60 * 1000;

export const BABY_FEED_LEGS_MAX = 8;

export type BabyFeedMethod = "breast_l" | "breast_r" | "formula" | "pump";

export type BabyFeedLeg = {
  method: BabyFeedMethod;
  durationSec?: number;
  amountMl?: number;
};

export function graceEndsAt(
  stoppedAt: number,
  graceMs: number = BABY_FEED_POST_STOP_GRACE_MS,
): number {
  return stoppedAt + graceMs;
}

/**
 * Split mergeability:
 * - Open breast: id + breastRunning + updatedAt within maxOpen (default 6h) → merge, no 5-min clock.
 * - Post-stop: no breastRunning → merge only while updatedAt within 5 min (skew ≤6 when clientStillInGrace).
 */
export function isFeedSessionMergeable(input: {
  hasSessionId: boolean;
  breastRunning: boolean;
  updatedAt: number | Date;
  now: number;
  maxOpenMs?: number;
  graceMs?: number;
  graceSkewMs?: number;
  clientStillInGrace?: boolean;
}): boolean {
  if (!input.hasSessionId) return false;
  const updatedAt =
    input.updatedAt instanceof Date
      ? input.updatedAt.getTime()
      : input.updatedAt;
  const age = input.now - updatedAt;
  const maxOpenMs = input.maxOpenMs ?? BABY_BREAST_TIMER_STALE_MS;

  if (input.breastRunning) {
    return age <= maxOpenMs;
  }

  const graceMs = input.graceMs ?? BABY_FEED_POST_STOP_GRACE_MS;
  if (age <= graceMs) return true;
  if (
    input.clientStillInGrace &&
    age <= (input.graceSkewMs ?? BABY_FEED_POST_STOP_GRACE_SKEW_MS)
  ) {
    return true;
  }
  return false;
}

/** One leg per method; sum durationSec / amountMl into the existing method. Cap ≤ 8. */
export function mergeFeedLegs(
  existing: BabyFeedLeg[],
  incoming?: BabyFeedLeg | BabyFeedLeg[],
): BabyFeedLeg[] {
  const add = incoming
    ? Array.isArray(incoming)
      ? incoming
      : [incoming]
    : [];
  const all = [...existing, ...add];
  const byMethod = new Map<BabyFeedMethod, BabyFeedLeg>();
  const order: BabyFeedMethod[] = [];

  for (const leg of all) {
    const prev = byMethod.get(leg.method);
    if (!prev) {
      order.push(leg.method);
      byMethod.set(leg.method, { ...leg });
      continue;
    }
    const next: BabyFeedLeg = { method: leg.method };
    const duration =
      (prev.durationSec ?? 0) + (leg.durationSec ?? 0);
    const amount = (prev.amountMl ?? 0) + (leg.amountMl ?? 0);
    if (duration > 0) next.durationSec = duration;
    if (amount > 0) next.amountMl = amount;
    byMethod.set(leg.method, next);
  }

  return order
    .slice(0, BABY_FEED_LEGS_MAX)
    .map((m) => byMethod.get(m)!)
    .filter(Boolean);
}

/** Non-empty legs for combined summary (skip zero duration / missing formula ml). */
export function feedSessionSummaryParts(legs: BabyFeedLeg[]): BabyFeedLeg[] {
  return legs.filter((leg) => {
    if (leg.method === "formula") {
      return typeof leg.amountMl === "number" && leg.amountMl > 0;
    }
    return typeof leg.durationSec === "number" && leg.durationSec > 0;
  });
}

/**
 * Primary method = last non-pump leg; durationSec = sum breast/pump; amountMl from formula.
 */
export function rollUpFeedPayload(legs: BabyFeedLeg[]): {
  method: BabyFeedMethod;
  durationSec?: number;
  amountMl?: number;
  legs: BabyFeedLeg[];
} {
  const merged = mergeFeedLegs(legs);
  let durationSec = 0;
  let amountMl: number | undefined;
  let method: BabyFeedMethod = "breast_l";

  for (const leg of merged) {
    if (leg.method !== "pump") {
      method = leg.method;
    }
    if (typeof leg.durationSec === "number") {
      durationSec += leg.durationSec;
    }
    if (leg.method === "formula" && typeof leg.amountMl === "number") {
      amountMl = (amountMl ?? 0) + leg.amountMl;
    }
  }

  const out: {
    method: BabyFeedMethod;
    durationSec?: number;
    amountMl?: number;
    legs: BabyFeedLeg[];
  } = { method, legs: merged };
  if (durationSec > 0) out.durationSec = durationSec;
  if (amountMl != null && amountMl > 0) out.amountMl = amountMl;
  return out;
}
