import { babyBreastElapsedSec } from "@/lib/baby-breast-timer-store";
import type { BabyBreastSide } from "@/lib/baby-breast-timer-store";
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
  breastRunning: { side: BabyBreastSide; durationSec: number } | null;
  /** Merge target when client still has an open/grace feed session. */
  feedSessionEventId?: string;
};

/** What the client changes locally, only after the server confirms. */
export type BabyQuickLocalAfter = {
  clearBreastTimer: boolean;
  startBreastSide: BabyBreastSide | null;
  /** true when this press fully stops breast (no new side start). */
  stopBreastSession: boolean;
};

/**
 * Derive local follow-up from a wire request. Used on first success and on
 * Retry so a confirmed response always clears/starts the breast timer even
 * when steps is non-empty (idle breast + endNap) or breastRunning was set.
 */
export function localAfterFromQuickRequest(
  request: BabyQuickCareRequest,
): BabyQuickLocalAfter {
  const { action, breastRunning } = request;

  if (action.kind === "BREAST") {
    if (!breastRunning) {
      return {
        clearBreastTimer: false,
        startBreastSide: action.side,
        stopBreastSession: false,
      };
    }
    if (breastRunning.side === action.side) {
      return {
        clearBreastTimer: true,
        startBreastSide: null,
        stopBreastSession: true,
      };
    }
    return {
      clearBreastTimer: true,
      startBreastSide: action.side,
      stopBreastSession: false,
    };
  }

  if (breastRunning) {
    return {
      clearBreastTimer: true,
      startBreastSide: null,
      stopBreastSession: true,
    };
  }
  return {
    clearBreastTimer: false,
    startBreastSide: null,
    stopBreastSession: false,
  };
}

/**
 * Builds the request and the local follow-up. Exactly two keys — no
 * expectedSteps, no napOpen. The server owns the order.
 */
export function planBabyQuickCare(
  action: BabyQuickAction,
  state: {
    breast: { side: BabyBreastSide; startedAt: number } | null;
    now: number;
    /** Mergeable session handle from client store (omit when expired/cleared). */
    feedSessionEventId?: string | null;
  },
): {
  request: BabyQuickCareRequest;
  localAfter: BabyQuickLocalAfter;
} {
  const breastRunning = state.breast
    ? {
        side: state.breast.side,
        durationSec: Math.max(
          1,
          babyBreastElapsedSec(state.breast.startedAt, state.now),
        ),
      }
    : null;

  const writesFeed =
    Boolean(breastRunning) || action.kind === "FORMULA";
  const feedSessionEventId =
    writesFeed && state.feedSessionEventId
      ? state.feedSessionEventId
      : undefined;

  const request: BabyQuickCareRequest = {
    action,
    breastRunning,
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
      (s.step === "saveBreast" || s.step === "createFormula") &&
      s.event.type === "feed",
  );

  // Timer-only breast start (no feed write): keep session id, clear grace so
  // open continuation stays mergeable past the prior stop deadline.
  if (feedSteps.length === 0) {
    if (
      input.localAfter.startBreastSide != null &&
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
  if (input.localAfter.startBreastSide != null) {
    graceEndsAtMs = null;
  } else if (input.localAfter.stopBreastSession) {
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
    case "createDiaper":
      return "home.stepCreateDiaper";
  }
}
