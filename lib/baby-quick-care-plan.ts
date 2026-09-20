import {
  babyBreastElapsedSec,
  isBabyBreastCareSide,
  isBabyPumpCareSide,
  type BabyCareTimerSide,
  type BabyBreastCareSide,
  type BabyPumpCareSide,
} from "@/lib/baby-breast-timer-store";
import { graceEndsAt } from "@/lib/baby-feed-session";
import type { BabyFeedSessionHandle } from "@/lib/baby-feed-session-store";
import type {
  BabyQuickAction,
  BabyQuickCareStepName,
} from "@/lib/baby-quick-care-order-fixture";

export type { BabyQuickAction, BabyQuickCareStepName };

/** What goes on the wire. The server decides the order and re-reads the nap. */
export type BabyQuickCareRequest = {
  action: BabyQuickAction;
  breastRunning: { side: BabyCareTimerSide; durationSec: number } | null;
  /** Merge target when client still has an open/grace feed session. */
  feedSessionEventId?: string;
  /** Optional backdate — Nap idle / Diaper (truth table). */
  occurredAt?: string;
  /** Optional end clock — Nap running end (truth table). */
  endedAt?: string;
};

/** What the client changes locally, only after the server confirms. */
export type BabyQuickLocalAfter = {
  clearBreastTimer: boolean;
  startBreastSide: BabyBreastCareSide | null;
  /** true when this press fully stops breast (no new side start). */
  stopBreastSession: boolean;
  clearPumpTimer: boolean;
  startPumpSide: BabyPumpCareSide | null;
  stopPumpSession: boolean;
};

export function isPumpFamilyQuickAction(action: {
  kind: string;
  side?: string;
}): boolean {
  if (action.kind === "PUMP_AMOUNT") return true;
  return (
    action.kind === "BREAST" &&
    (action.side === "pump_l" || action.side === "pump_r")
  );
}

function emptyLocalAfter(): BabyQuickLocalAfter {
  return {
    clearBreastTimer: false,
    startBreastSide: null,
    stopBreastSession: false,
    clearPumpTimer: false,
    startPumpSide: null,
    stopPumpSession: false,
  };
}

/**
 * Derive local follow-up from a wire request. Used on first success and on
 * Retry so a confirmed response always clears/starts the timers even when
 * steps is non-empty (idle breast + endNap) or breastRunning was set.
 */
export function localAfterFromQuickRequest(
  request: BabyQuickCareRequest,
): BabyQuickLocalAfter {
  const { action, breastRunning } = request;
  const out = emptyLocalAfter();

  if (action.kind === "BREAST" && isBabyPumpCareSide(action.side)) {
    // Pump family — only touch pump slot; breastRunning on wire is pump side.
    if (!breastRunning) {
      out.startPumpSide = action.side;
      return out;
    }
    if (breastRunning.side === action.side) {
      out.clearPumpTimer = true;
      out.stopPumpSession = true;
      return out;
    }
    // Switch pump L↔R
    out.clearPumpTimer = true;
    out.startPumpSide = action.side;
    return out;
  }

  if (action.kind === "BREAST" && isBabyBreastCareSide(action.side)) {
    if (!breastRunning) {
      out.startBreastSide = action.side;
      return out;
    }
    if (breastRunning.side === action.side) {
      out.clearBreastTimer = true;
      out.stopBreastSession = true;
      return out;
    }
    out.clearBreastTimer = true;
    out.startBreastSide = action.side;
    return out;
  }

  // PUMP_AMOUNT — never stop breast or pump timers
  if (action.kind === "PUMP_AMOUNT") {
    return out;
  }

  // FORMULA / SLEEP / DIAPER — stop breast slot if wire carried breastRunning
  if (breastRunning && isBabyBreastCareSide(breastRunning.side)) {
    out.clearBreastTimer = true;
    out.stopBreastSession = true;
  } else if (breastRunning && isBabyPumpCareSide(breastRunning.side)) {
    // Should not happen for non-pump actions after plan fix; clear pump if sent
    out.clearPumpTimer = true;
    out.stopPumpSession = true;
  }
  return out;
}

/**
 * Builds the request and the local follow-up. Exactly two keys — no
 * expectedSteps, no napOpen. The server owns the order.
 */
export function planBabyQuickCare(
  action: BabyQuickAction,
  state: {
    /** @deprecated Prefer breastSlot / pumpSlot — single active side. */
    breast?: { side: BabyCareTimerSide; startedAt: number } | null;
    breastSlot?: { side: BabyBreastCareSide; startedAt: number } | null;
    pumpSlot?: { side: BabyPumpCareSide; startedAt: number } | null;
    now: number;
    /** Mergeable session handle from client store (omit when expired/cleared). */
    feedSessionEventId?: string | null;
  },
): {
  request: BabyQuickCareRequest;
  localAfter: BabyQuickLocalAfter;
} {
  const breastSlot =
    state.breastSlot !== undefined
      ? state.breastSlot
      : state.breast && isBabyBreastCareSide(state.breast.side)
        ? { side: state.breast.side, startedAt: state.breast.startedAt }
        : null;
  const pumpSlot =
    state.pumpSlot !== undefined
      ? state.pumpSlot
      : state.breast && isBabyPumpCareSide(state.breast.side)
        ? { side: state.breast.side, startedAt: state.breast.startedAt }
        : null;

  let wireRunning: {
    side: BabyCareTimerSide;
    durationSec: number;
  } | null = null;

  if (action.kind === "BREAST" && isBabyPumpCareSide(action.side)) {
    if (pumpSlot) {
      wireRunning = {
        side: pumpSlot.side,
        durationSec: Math.max(
          1,
          babyBreastElapsedSec(pumpSlot.startedAt, state.now),
        ),
      };
    }
  } else if (action.kind === "BREAST" && isBabyBreastCareSide(action.side)) {
    if (breastSlot) {
      wireRunning = {
        side: breastSlot.side,
        durationSec: Math.max(
          1,
          babyBreastElapsedSec(breastSlot.startedAt, state.now),
        ),
      };
    }
  } else if (action.kind === "PUMP_AMOUNT") {
    // Independence: never attach breast or pump running to stop them.
    wireRunning = null;
  } else {
    // FORMULA / SLEEP / DIAPER — attach breast slot only (not pump)
    if (breastSlot) {
      wireRunning = {
        side: breastSlot.side,
        durationSec: Math.max(
          1,
          babyBreastElapsedSec(breastSlot.startedAt, state.now),
        ),
      };
    }
  }

  const writesFeed =
    Boolean(wireRunning) ||
    action.kind === "FORMULA" ||
    action.kind === "PUMP_AMOUNT" ||
    (action.kind === "BREAST" && isBabyPumpCareSide(action.side));
  const feedSessionEventId =
    writesFeed && state.feedSessionEventId
      ? state.feedSessionEventId
      : undefined;

  const request: BabyQuickCareRequest = {
    action,
    breastRunning: wireRunning,
    ...(feedSessionEventId ? { feedSessionEventId } : {}),
  };
  return {
    request,
    localAfter: localAfterFromQuickRequest(request),
  };
}

/**
 * After a successful quick-care response, adopt the feed session handle.
 * Insert outcome or different event id → replace store with new id.
 * Never keep the request id after an insert outcome.
 */
export function adoptFeedSessionAfterQuickCare(input: {
  babyId: string;
  now: number;
  previous: BabyFeedSessionHandle | null;
  localAfter: BabyQuickLocalAfter;
  steps: Array<{
    step: string;
    wrote?: string;
    event: { id: string; type: string };
  }>;
}): BabyFeedSessionHandle | null {
  const feedSteps = input.steps.filter(
    (s) =>
      (s.step === "saveBreast" ||
        s.step === "createFormula" ||
        s.step === "createPumpAmount") &&
      s.event.type === "feed",
  );

  // Timer-only breast/pump start (no feed write): keep session id, clear grace.
  if (feedSteps.length === 0) {
    if (
      (input.localAfter.startBreastSide != null ||
        input.localAfter.startPumpSide != null) &&
      input.previous
    ) {
      return { ...input.previous, graceEndsAtMs: null };
    }
    return input.previous;
  }

  const insertStep = feedSteps.find((s) => s.wrote === "insert");
  const last = feedSteps[feedSteps.length - 1]!;
  const eventId = insertStep?.event.id ?? last.event.id;

  let graceEndsAtMs: number | null;
  if (
    input.localAfter.startBreastSide != null ||
    input.localAfter.startPumpSide != null
  ) {
    graceEndsAtMs = null;
  } else if (
    input.localAfter.stopBreastSession ||
    input.localAfter.stopPumpSession
  ) {
    graceEndsAtMs = graceEndsAt(input.now);
  } else {
    graceEndsAtMs = input.previous?.graceEndsAtMs ?? null;
  }

  return {
    babyId: input.babyId,
    eventId,
    graceEndsAtMs,
  };
}

/**
 * Message key for a step the SERVER committed. Fed from the response's
 * `steps`, never from a client guess.
 */
export function babyQuickCareStepMessageKey(
  step: BabyQuickCareStepName,
): string {
  switch (step) {
    case "saveBreast":
      return "home.stepSaveBreast";
    case "endNap":
      return "home.stepEndNap";
    case "startNap":
      return "home.stepStartNap";
    case "createFormula":
      return "home.stepCreateFormula";
    case "createPumpAmount":
      return "home.stepCreatePumpAmount";
    case "createDiaper":
      return "home.stepCreateDiaper";
  }
}
