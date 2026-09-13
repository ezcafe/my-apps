export const BABY_FEED_SESSION_STORAGE_KEY = "baby.feedSession.v1";

const EVENT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BabyFeedSessionHandle = {
  babyId: string;
  eventId: string;
  /** null while breast still running / open continuation; set on stop. */
  graceEndsAtMs: number | null;
};

export function serializeBabyFeedSessionHandle(
  handle: BabyFeedSessionHandle,
): string {
  return JSON.stringify(handle);
}

export function clearBabyFeedSessionHandle(): string {
  return "";
}

export function shouldClearFeedSessionHandle(
  handle: BabyFeedSessionHandle,
  now: number,
): boolean {
  return (
    handle.graceEndsAtMs != null && now > handle.graceEndsAtMs
  );
}

/**
 * Wrong baby → null. Grace expired (graceEndsAtMs set and past) → null.
 * Open (graceEndsAtMs null) always returned when baby matches.
 */
export function parseBabyFeedSessionHandle(
  raw: string | null,
  ctx: { babyId: string; now: number },
): BabyFeedSessionHandle | null {
  if (raw == null || raw === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  if (typeof o.babyId !== "string" || typeof o.eventId !== "string") {
    return null;
  }
  if (!EVENT_ID_RE.test(o.eventId)) return null;
  if (
    o.graceEndsAtMs != null &&
    typeof o.graceEndsAtMs !== "number"
  ) {
    return null;
  }
  const handle: BabyFeedSessionHandle = {
    babyId: o.babyId,
    eventId: o.eventId,
    graceEndsAtMs:
      typeof o.graceEndsAtMs === "number" ? o.graceEndsAtMs : null,
  };
  if (handle.babyId !== ctx.babyId) return null;
  if (shouldClearFeedSessionHandle(handle, ctx.now)) return null;
  return handle;
}
