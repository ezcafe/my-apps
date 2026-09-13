export const BABY_BREAST_TIMER_STORAGE_KEY = "baby.breastTimer.v1";
export const BABY_BREAST_TIMER_STALE_MS = 6 * 60 * 60 * 1000;

export type BabyBreastSide = "breast_l" | "breast_r";

export type BabyBreastTimer = {
  babyId: string;
  side: BabyBreastSide;
  startedAt: number;
};

export function serializeBabyBreastTimer(timer: BabyBreastTimer): string {
  return JSON.stringify(timer);
}

/**
 * Wrong baby → null. Older than the stale window → still returned with
 * stale: true; never silently thrown away.
 */
export function parseBabyBreastTimer(
  raw: string | null,
  ctx: { babyId: string; now: number },
): { timer: BabyBreastTimer; stale: boolean } | null {
  if (raw == null || raw === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as BabyBreastTimer).babyId !== "string" ||
    ((parsed as BabyBreastTimer).side !== "breast_l" &&
      (parsed as BabyBreastTimer).side !== "breast_r") ||
    typeof (parsed as BabyBreastTimer).startedAt !== "number"
  ) {
    return null;
  }
  const timer = parsed as BabyBreastTimer;
  if (timer.babyId !== ctx.babyId) return null;
  const stale = ctx.now - timer.startedAt > BABY_BREAST_TIMER_STALE_MS;
  return { timer, stale };
}

export function babyBreastElapsedSec(startedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}
