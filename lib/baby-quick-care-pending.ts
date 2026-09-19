import type { BabyQuickAction } from "@/lib/baby-quick-care-order-fixture";
import type { BabyQuickCareRequest } from "@/lib/baby-quick-care-plan";

/** Design contract key (03-design.md). */
export const BABY_QUICK_PENDING_STORAGE_KEY = "baby.quickCare.pending.v1";
/** Pre-rename key — read once and migrate so an in-flight pending is not lost. */
export const BABY_QUICK_PENDING_STORAGE_KEY_LEGACY = "baby.quickPending.v1";
export const BABY_QUICK_PENDING_RETRY_MAX_AGE_MS = 30 * 60 * 1000;

export type BabyQuickPendingState = "sending" | "unknown";

export type BabyQuickPending = {
  babyId: string;
  requestId: string;
  request: BabyQuickCareRequest;
  state: BabyQuickPendingState;
  startedAt: number;
};

/**
 * Clear rules (defer to classifyBabyQuickCareError):
 * - Cleared on any confirmed outcome (success or replayed: true).
 * - Cleared on a definite-no-commit code (UNAUTHORIZED / FORBIDDEN / NOT_FOUND).
 * - Kept and marked "unknown" on every other error.
 */
export function serializeBabyQuickPending(pending: BabyQuickPending): string {
  return JSON.stringify(pending);
}

export function parseBabyQuickPending(
  raw: string | null,
  ctx: { babyId: string },
): BabyQuickPending | null {
  if (raw == null || raw === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Partial<BabyQuickPending>;
  if (
    typeof p.babyId !== "string" ||
    typeof p.requestId !== "string" ||
    typeof p.startedAt !== "number" ||
    (p.state !== "sending" && p.state !== "unknown") ||
    !p.request ||
    typeof p.request !== "object"
  ) {
    return null;
  }
  if (p.babyId !== ctx.babyId) return null;
  return p as BabyQuickPending;
}

export type BabyQuickPendingView =
  | { kind: "none" }
  | { kind: "retryable"; pending: BabyQuickPending }
  | { kind: "tooOld"; pending: BabyQuickPending };

export function babyQuickPendingView(
  pending: BabyQuickPending | null,
  now: number,
): BabyQuickPendingView {
  if (!pending) return { kind: "none" };
  const age = now - pending.startedAt;
  if (age >= BABY_QUICK_PENDING_RETRY_MAX_AGE_MS) {
    return { kind: "tooOld", pending };
  }
  return { kind: "retryable", pending };
}

/** Fail-closed verify: write then read-back must serialize identically. */
export function babyQuickPendingMatches(
  intended: BabyQuickPending,
  parsed: BabyQuickPending | null,
): boolean {
  if (!parsed) return false;
  return (
    serializeBabyQuickPending(parsed) === serializeBabyQuickPending(intended)
  );
}

/** Try again resends the stored request + id — never the current card value. */
export function babyQuickCareRetryPayload(pending: BabyQuickPending): {
  request: BabyQuickCareRequest;
  clientRequestId: string;
} {
  return {
    request: pending.request,
    clientRequestId: pending.requestId,
  };
}

type PendingStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
};

/**
 * Persist pending to a storage-like object. Returns false on throw or
 * read-back mismatch (fail-closed — do not send the mutation).
 */
export function writeBabyQuickPending(
  storage: PendingStorage,
  record: BabyQuickPending,
): boolean {
  try {
    storage.setItem(
      BABY_QUICK_PENDING_STORAGE_KEY,
      serializeBabyQuickPending(record),
    );
    const back = parseBabyQuickPending(
      storage.getItem(BABY_QUICK_PENDING_STORAGE_KEY),
      { babyId: record.babyId },
    );
    if (!babyQuickPendingMatches(record, back)) return false;
    // Drop the legacy key once the new key is known-good.
    try {
      storage.removeItem?.(BABY_QUICK_PENDING_STORAGE_KEY_LEGACY);
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Read pending from the design key, or migrate once from the legacy key.
 */
export function readBabyQuickPending(
  storage: PendingStorage,
  ctx: { babyId: string },
): BabyQuickPending | null {
  const current = parseBabyQuickPending(
    storage.getItem(BABY_QUICK_PENDING_STORAGE_KEY),
    ctx,
  );
  if (current) return current;

  const legacy = parseBabyQuickPending(
    storage.getItem(BABY_QUICK_PENDING_STORAGE_KEY_LEGACY),
    ctx,
  );
  if (!legacy) return null;

  if (writeBabyQuickPending(storage, legacy)) {
    return legacy;
  }
  // Migration write failed — still return the parsed legacy so Retry is offered.
  return legacy;
}

/** Remove both the design key and the legacy key. */
export function clearBabyQuickPending(storage: PendingStorage): void {
  try {
    storage.removeItem?.(BABY_QUICK_PENDING_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    storage.removeItem?.(BABY_QUICK_PENDING_STORAGE_KEY_LEGACY);
  } catch {
    /* ignore */
  }
}

/** Home never auto-retries a pending press on mount. */
export function babyQuickShouldAutoRetryOnMount(): false {
  return false;
}

/**
 * Owning trigger for under-chip / under-group recovery chrome.
 * Bottle / pump amount / diaper are group owners (recovery under the row).
 */
export type BabyQuickPendingOwnerId =
  | "breast_l"
  | "breast_r"
  | "pump_l"
  | "pump_r"
  | "nap"
  | "bottle"
  | "pump_amount"
  | "diaper";

export function babyQuickPendingOwner(
  action: BabyQuickAction,
): BabyQuickPendingOwnerId {
  if (action.kind === "BREAST") return action.side;
  if (action.kind === "SLEEP") return "nap";
  if (action.kind === "FORMULA") return "bottle";
  if (action.kind === "PUMP_AMOUNT") return "pump_amount";
  return "diaper";
}

/**
 * Show under-owner recovery when not currently saving and pending is
 * recoverable: tooOld, unknown, or orphaned sending after remount.
 * Quiet live mutate / Retry mid-flight via `!saving` — not "never for sending".
 */
export function babyQuickPendingRecoveryVisible(input: {
  saving: boolean;
  view: BabyQuickPendingView;
}): boolean {
  if (input.saving) return false;
  return input.view.kind === "retryable" || input.view.kind === "tooOld";
}
