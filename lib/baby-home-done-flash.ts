/** Brief Done/Logged flash after care saves (breast stop, bottle, nap, diaper). */
export const BABY_HOME_DONE_MS = 2000;

const DIAPER_DONE_KINDS = new Set(["wet", "dry", "dirty", "mixed"]);

/** Any saved diaper kind gets a Done flash on that tile. */
export function babyHomeDiaperDoneKind(
  diaperKind: string | undefined | null,
): "wet" | "dry" | "dirty" | "mixed" | null {
  if (diaperKind && DIAPER_DONE_KINDS.has(diaperKind)) {
    return diaperKind as "wet" | "dry" | "dirty" | "mixed";
  }
  return null;
}

/** Keep saved formula ml for ~2s flash (Kind-like); ignore invalid amounts. */
export function babyHomeBottleDoneMl(
  amountMl: number | undefined | null,
): number | null {
  if (typeof amountMl !== "number" || !Number.isFinite(amountMl) || amountMl <= 0) {
    return null;
  }
  return amountMl;
}

/** Second click that fully stops a timed care side → Done on that side. */
export function babyHomeBreastDoneSide(input: {
  stopBreastSession: boolean;
  side:
    | "breast_l"
    | "breast_r"
    | "pump_l"
    | "pump_r"
    | "pump_both"
    | undefined
    | null;
}): "breast_l" | "breast_r" | "pump_l" | "pump_r" | "pump_both" | null {
  if (!input.stopBreastSession) return null;
  if (
    input.side === "breast_l" ||
    input.side === "breast_r" ||
    input.side === "pump_l" ||
    input.side === "pump_r" ||
    input.side === "pump_both"
  ) {
    return input.side;
  }
  return null;
}

/**
 * Nap/Sleep Done flash only after End/stop — never after Start while the
 * session is still running (same gate as breast/pump stopBreastSession).
 */
export function babyHomeSleepDoneFlash(input: {
  endedSleepSession: boolean;
}): boolean {
  return input.endedSleepSession;
}

/** Brief pause so Done can paint before forms navigate home. */
export const BABY_CARE_DONE_BEFORE_NAV_MS = 450;

export type BabyHomeDoneFlashTimerHost = {
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
};

export type BabyHomeDoneFlashTimer = {
  /** Arm clear after ms; clears any prior pending timeout first. */
  arm: (clear: () => void, ms?: number) => void;
  /** Cancel pending timeout (unmount / route leave). */
  dispose: () => void;
};

/**
 * Owns one Done-flash timeout handle: clear-before-rearm + dispose on unmount.
 * Keeps setState from firing after navigate-away and stops stacked timers.
 *
 * Default host wrappers call global timers unbound — browsers throw
 * "Illegal invocation" if window.setTimeout is stored on a host object and
 * invoked as host.setTimeout(...).
 */
export function createBabyHomeDoneFlashTimer(
  host: BabyHomeDoneFlashTimerHost = {
    setTimeout: ((fn: () => void, ms?: number) =>
      globalThis.setTimeout(fn, ms)) as typeof setTimeout,
    clearTimeout: ((id: ReturnType<typeof setTimeout>) =>
      globalThis.clearTimeout(id)) as typeof clearTimeout,
  },
): BabyHomeDoneFlashTimer {
  let id: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;

  return {
    arm(clear, ms = BABY_HOME_DONE_MS) {
      if (id != null) {
        host.clearTimeout(id);
        id = null;
      }
      const gen = ++generation;
      id = host.setTimeout(() => {
        if (gen !== generation) return;
        id = null;
        clear();
      }, ms);
    },
    dispose() {
      generation += 1;
      if (id != null) {
        host.clearTimeout(id);
        id = null;
      }
    },
  };
}

/** Schedule clearing the Done flash; injectable timer for unit tests. */
export function scheduleBabyHomeDoneClear(
  clear: () => void,
  setTimeoutFn: typeof setTimeout = setTimeout,
  ms: number = BABY_HOME_DONE_MS,
): ReturnType<typeof setTimeout> {
  return setTimeoutFn(clear, ms);
}
