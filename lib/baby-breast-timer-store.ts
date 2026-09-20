/** Legacy key — one-time migrate into careTimer.v1. */
export const BABY_BREAST_TIMER_STORAGE_KEY = "baby.breastTimer.v1";
/** Widened care-timer store (breast + pump timed sides). */
export const BABY_CARE_TIMER_STORAGE_KEY = "baby.careTimer.v1";
/**
 * Client-only id for Home / Feed / Pump timer sync in localStorage.
 * Must match across those surfaces so a running Home breast shows on Feed.
 */
export const BABY_CARE_TIMER_CLIENT_ID = "home";

export const BABY_BREAST_TIMER_STALE_MS = 6 * 60 * 60 * 1000;
export const BABY_CARE_TIMER_STALE_MS = BABY_BREAST_TIMER_STALE_MS;

export type BabyCareTimerSide =
  | "breast_l"
  | "breast_r"
  | "pump_l"
  | "pump_r"
  | "pump_both";

export type BabyBreastCareSide = "breast_l" | "breast_r";
export type BabyPumpCareSide = "pump_l" | "pump_r" | "pump_both";

/** @deprecated Prefer BabyCareTimerSide — kept as alias after widen. */
export type BabyBreastSide = BabyCareTimerSide;

export type BabyCareTimer = {
  babyId: string;
  side: BabyCareTimerSide;
  startedAt: number;
};

/** Concurrent breast + pump timer slots (same baby). */
export type BabyCareTimerSlots = {
  babyId: string;
  breast: { side: BabyBreastCareSide; startedAt: number } | null;
  pump: { side: BabyPumpCareSide; startedAt: number } | null;
};

/** @deprecated Prefer BabyCareTimer. */
export type BabyBreastTimer = BabyCareTimer;

const CARE_TIMER_SIDES = new Set<string>([
  "breast_l",
  "breast_r",
  "pump_l",
  "pump_r",
  "pump_both",
]);

export function isBabyCareTimerSide(value: unknown): value is BabyCareTimerSide {
  return typeof value === "string" && CARE_TIMER_SIDES.has(value);
}

export function isBabyBreastCareSide(
  side: BabyCareTimerSide,
): side is BabyBreastCareSide {
  return side === "breast_l" || side === "breast_r";
}

export function isBabyPumpCareSide(
  side: BabyCareTimerSide,
): side is BabyPumpCareSide {
  return side === "pump_l" || side === "pump_r" || side === "pump_both";
}

export function emptyBabyCareTimerSlots(babyId: string): BabyCareTimerSlots {
  return { babyId, breast: null, pump: null };
}

export function serializeBabyCareTimer(timer: BabyCareTimer): string {
  return JSON.stringify(timer);
}

export function serializeBabyCareTimerSlots(slots: BabyCareTimerSlots): string {
  return JSON.stringify(slots);
}

/** @deprecated Prefer serializeBabyCareTimer. */
export const serializeBabyBreastTimer = serializeBabyCareTimer;

function staleFlag(startedAt: number, now: number): boolean {
  return now - startedAt > BABY_CARE_TIMER_STALE_MS;
}

function slotsFromLegacyTimer(timer: BabyCareTimer): BabyCareTimerSlots {
  return {
    babyId: timer.babyId,
    breast: isBabyBreastCareSide(timer.side)
      ? { side: timer.side, startedAt: timer.startedAt }
      : null,
    pump: isBabyPumpCareSide(timer.side)
      ? { side: timer.side, startedAt: timer.startedAt }
      : null,
  };
}

/** Set or clear one family; leave the other family unchanged. */
export function withCareTimerSide(
  previous: BabyCareTimerSlots | null,
  input: {
    babyId: string;
    side: BabyCareTimerSide | null;
    now: number;
    /** When side is null, which family to clear. */
    clearFamily?: "breast" | "pump";
  },
): BabyCareTimerSlots {
  const base = previous ?? emptyBabyCareTimerSlots(input.babyId);
  const next: BabyCareTimerSlots = {
    babyId: input.babyId,
    breast: base.breast,
    pump: base.pump,
  };
  if (input.side == null) {
    if (input.clearFamily === "pump") next.pump = null;
    else next.breast = null;
    return next;
  }
  if (isBabyBreastCareSide(input.side)) {
    next.breast = { side: input.side, startedAt: input.now };
  } else {
    next.pump = { side: input.side, startedAt: input.now };
  }
  return next;
}

/**
 * Wrong baby → null. Older than the stale window → still returned with
 * stale: true; never silently thrown away. Unknown side / bad JSON → null.
 */
export function parseBabyCareTimer(
  raw: string | null,
  ctx: { babyId: string; now: number },
): { timer: BabyCareTimer; stale: boolean } | null {
  const parsed = parseBabyCareTimerSlots(raw, ctx);
  if (!parsed) return null;
  const timer = primaryTimerFromSlots(parsed.slots);
  if (!timer) return null;
  return { timer, stale: staleFlag(timer.startedAt, ctx.now) };
}

export function primaryTimerFromSlots(
  slots: BabyCareTimerSlots,
): BabyCareTimer | null {
  if (slots.breast) {
    return {
      babyId: slots.babyId,
      side: slots.breast.side,
      startedAt: slots.breast.startedAt,
    };
  }
  if (slots.pump) {
    return {
      babyId: slots.babyId,
      side: slots.pump.side,
      startedAt: slots.pump.startedAt,
    };
  }
  return null;
}

/** Parse dual-slot or legacy single-side JSON. */
export function parseBabyCareTimerSlots(
  raw: string | null,
  ctx: { babyId: string; now: number },
): {
  slots: BabyCareTimerSlots;
  breastStale: boolean;
  pumpStale: boolean;
} | null {
  if (raw == null || raw === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.babyId !== "string" || obj.babyId !== ctx.babyId) return null;

  if ("breast" in obj || "pump" in obj) {
    const breastRaw = obj.breast;
    const pumpRaw = obj.pump;
    const breast =
      breastRaw &&
      typeof breastRaw === "object" &&
      isBabyCareTimerSide((breastRaw as BabyCareTimer).side) &&
      isBabyBreastCareSide((breastRaw as BabyCareTimer).side) &&
      typeof (breastRaw as BabyCareTimer).startedAt === "number"
        ? {
            side: (breastRaw as BabyCareTimer).side as BabyBreastCareSide,
            startedAt: (breastRaw as BabyCareTimer).startedAt,
          }
        : null;
    const pump =
      pumpRaw &&
      typeof pumpRaw === "object" &&
      isBabyCareTimerSide((pumpRaw as BabyCareTimer).side) &&
      isBabyPumpCareSide((pumpRaw as BabyCareTimer).side) &&
      typeof (pumpRaw as BabyCareTimer).startedAt === "number"
        ? {
            side: (pumpRaw as BabyCareTimer).side as BabyPumpCareSide,
            startedAt: (pumpRaw as BabyCareTimer).startedAt,
          }
        : null;
    const slots: BabyCareTimerSlots = {
      babyId: obj.babyId,
      breast,
      pump,
    };
    return {
      slots,
      breastStale: breast ? staleFlag(breast.startedAt, ctx.now) : false,
      pumpStale: pump ? staleFlag(pump.startedAt, ctx.now) : false,
    };
  }

  if (!isBabyCareTimerSide(obj.side) || typeof obj.startedAt !== "number") {
    return null;
  }
  const timer: BabyCareTimer = {
    babyId: obj.babyId,
    side: obj.side,
    startedAt: obj.startedAt,
  };
  const slots = slotsFromLegacyTimer(timer);
  return {
    slots,
    breastStale: slots.breast ? staleFlag(timer.startedAt, ctx.now) : false,
    pumpStale: slots.pump ? staleFlag(timer.startedAt, ctx.now) : false,
  };
}

/** @deprecated Prefer parseBabyCareTimer. */
export const parseBabyBreastTimer = parseBabyCareTimer;

export function readBabyCareTimerSlots(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  ctx: { babyId: string; now: number },
): {
  slots: BabyCareTimerSlots;
  breastStale: boolean;
  pumpStale: boolean;
} | null {
  const fromCare = parseBabyCareTimerSlots(
    storage.getItem(BABY_CARE_TIMER_STORAGE_KEY),
    ctx,
  );
  if (fromCare) {
    storage.setItem(
      BABY_CARE_TIMER_STORAGE_KEY,
      serializeBabyCareTimerSlots(fromCare.slots),
    );
    return fromCare;
  }

  const legacyRaw = storage.getItem(BABY_BREAST_TIMER_STORAGE_KEY);
  const fromLegacy = parseBabyCareTimerSlots(legacyRaw, ctx);
  if (!fromLegacy) return null;

  storage.setItem(
    BABY_CARE_TIMER_STORAGE_KEY,
    serializeBabyCareTimerSlots(fromLegacy.slots),
  );
  storage.removeItem(BABY_BREAST_TIMER_STORAGE_KEY);
  return fromLegacy;
}

/**
 * Read care timer: prefer v1 care key; if missing, migrate once from breast key.
 * Returns breast slot first, else pump (legacy single-active view).
 */
export function readBabyCareTimer(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  ctx: { babyId: string; now: number },
): { timer: BabyCareTimer; stale: boolean } | null {
  const parsed = readBabyCareTimerSlots(storage, ctx);
  if (!parsed) return null;
  const timer = primaryTimerFromSlots(parsed.slots);
  if (!timer) return null;
  const stale = isBabyBreastCareSide(timer.side)
    ? parsed.breastStale
    : parsed.pumpStale;
  return { timer, stale };
}

/** One running side within its family — returns the single-side timer shape. */
export function startBabyCareTimer(input: {
  babyId: string;
  side: BabyCareTimerSide;
  now: number;
}): BabyCareTimer {
  return {
    babyId: input.babyId,
    side: input.side,
    startedAt: input.now,
  };
}

export function writeBabyCareTimerSlots(
  storage: Pick<Storage, "setItem" | "removeItem">,
  slots: BabyCareTimerSlots | null,
): void {
  if (slots == null || (slots.breast == null && slots.pump == null)) {
    storage.removeItem(BABY_CARE_TIMER_STORAGE_KEY);
    storage.removeItem(BABY_BREAST_TIMER_STORAGE_KEY);
    return;
  }
  storage.setItem(
    BABY_CARE_TIMER_STORAGE_KEY,
    serializeBabyCareTimerSlots(slots),
  );
  storage.removeItem(BABY_BREAST_TIMER_STORAGE_KEY);
}

/**
 * Write a single active side. Prefer writeBabyCareTimerSlots on Home so the
 * other family is preserved — this replaces storage with one family only.
 */
export function writeBabyCareTimer(
  storage: Pick<Storage, "setItem" | "removeItem">,
  timer: BabyCareTimer | null,
): void {
  if (timer == null) {
    writeBabyCareTimerSlots(storage, null);
    return;
  }
  writeBabyCareTimerSlots(storage, slotsFromLegacyTimer(timer));
}

export function babyCareElapsedSec(startedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

/** @deprecated Prefer babyCareElapsedSec. */
export const babyBreastElapsedSec = babyCareElapsedSec;

/**
 * createBabyFeed input when stopping a care-timer side (breast/pump L·R·Both).
 * Duration is at least 1s so a same-second stop still writes a valid row.
 * `pump_both` expands to two feed legs (L + R).
 */
export function babyCareTimerStopFeedInput(
  side: BabyCareTimerSide,
  startedAt: number,
  now: number,
):
  | { method: Exclude<BabyCareTimerSide, "pump_both">; durationSec: number }
  | {
      methods: readonly ["pump_l", "pump_r"];
      durationSec: number;
    } {
  const durationSec = Math.max(1, babyCareElapsedSec(startedAt, now));
  if (side === "pump_both") {
    return { methods: ["pump_l", "pump_r"], durationSec };
  }
  return { method: side, durationSec };
}
