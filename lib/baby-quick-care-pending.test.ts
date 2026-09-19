import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BabyQuickCareRequest } from "@/lib/baby-quick-care-plan";
import {
  BABY_QUICK_PENDING_RETRY_MAX_AGE_MS,
  BABY_QUICK_PENDING_STORAGE_KEY,
  BABY_QUICK_PENDING_STORAGE_KEY_LEGACY,
  babyQuickCareRetryPayload,
  babyQuickPendingMatches,
  babyQuickPendingOwner,
  babyQuickPendingRecoveryVisible,
  babyQuickPendingView,
  babyQuickShouldAutoRetryOnMount,
  clearBabyQuickPending,
  parseBabyQuickPending,
  readBabyQuickPending,
  serializeBabyQuickPending,
  writeBabyQuickPending,
  type BabyQuickPending,
} from "@/lib/baby-quick-care-pending";

const base = {
  babyId: "baby-1",
  requestId: "req-abcdefgh",
  state: "sending" as const,
  startedAt: 1_700_000_000_000,
};

function pending(request: BabyQuickCareRequest): BabyQuickPending {
  return { ...base, request };
}

const shapes: BabyQuickCareRequest[] = [
  {
    action: { kind: "BREAST", side: "breast_l" },
    breastRunning: null,
  },
  {
    action: { kind: "BREAST", side: "breast_r" },
    breastRunning: { side: "breast_l", durationSec: 40 },
  },
  {
    action: { kind: "FORMULA", amountMl: 95 },
    breastRunning: null,
  },
  {
    action: { kind: "FORMULA", amountMl: 120 },
    breastRunning: { side: "breast_r", durationSec: 12 },
  },
  {
    action: { kind: "SLEEP" },
    breastRunning: null,
  },
  {
    action: { kind: "SLEEP" },
    breastRunning: { side: "breast_l", durationSec: 5 },
  },
  {
    action: { kind: "DIAPER", diaperKind: "dirty" },
    breastRunning: null,
  },
  {
    action: { kind: "DIAPER", diaperKind: "mixed" },
    breastRunning: { side: "breast_r", durationSec: 8 },
  },
];

describe("baby quick pending store", () => {
  it("serialize → parse round-trips all four action shapes", () => {
    for (const request of shapes) {
      const record = pending(request);
      const parsed = parseBabyQuickPending(serializeBabyQuickPending(record), {
        babyId: "baby-1",
      });
      assert.deepEqual(parsed, record);
      assert.equal(babyQuickPendingMatches(record, parsed), true);
    }
  });

  it("parse returns null for bad input or different babyId", () => {
    assert.equal(
      parseBabyQuickPending(null, { babyId: "baby-1" }),
      null,
    );
    assert.equal(parseBabyQuickPending("", { babyId: "baby-1" }), null);
    assert.equal(parseBabyQuickPending("{", { babyId: "baby-1" }), null);
    assert.equal(
      parseBabyQuickPending(
        serializeBabyQuickPending(pending(shapes[0]!)),
        { babyId: "other" },
      ),
      null,
    );
    const badState = {
      ...pending(shapes[0]!),
      state: "done",
    };
    assert.equal(
      parseBabyQuickPending(JSON.stringify(badState), { babyId: "baby-1" }),
      null,
    );
  });

  it("view is none / retryable / tooOld at the 30-minute boundary", () => {
    const record = pending(shapes[0]!);
    assert.deepEqual(babyQuickPendingView(null, record.startedAt), {
      kind: "none",
    });
    assert.equal(
      babyQuickPendingView(
        record,
        record.startedAt + BABY_QUICK_PENDING_RETRY_MAX_AGE_MS - 1,
      ).kind,
      "retryable",
    );
    assert.equal(
      babyQuickPendingView(
        record,
        record.startedAt + BABY_QUICK_PENDING_RETRY_MAX_AGE_MS,
      ).kind,
      "tooOld",
    );
  });

  it("Try again payload keeps stored amount, not a later card value", () => {
    const record = pending({
      action: { kind: "FORMULA", amountMl: 120 },
      breastRunning: null,
    });
    const cardNow = 150;
    const retry = babyQuickCareRetryPayload(record);
    assert.equal(
      retry.request.action.kind === "FORMULA" &&
        retry.request.action.amountMl,
      120,
    );
    assert.notEqual(cardNow, 120);
    assert.equal(retry.clientRequestId, record.requestId);
  });

  it("writeBabyQuickPending fails closed on throw or mismatch", () => {
    const record = pending(shapes[2]!);
    const okStore: Record<string, string> = {};
    assert.equal(
      writeBabyQuickPending(
        {
          getItem: (k) => okStore[k] ?? null,
          setItem: (k, v) => {
            okStore[k] = v;
          },
          removeItem: (k) => {
            delete okStore[k];
          },
        },
        record,
      ),
      true,
    );
    assert.equal(
      okStore[BABY_QUICK_PENDING_STORAGE_KEY] != null,
      true,
    );

    assert.equal(
      writeBabyQuickPending(
        {
          getItem: () => null,
          setItem: () => {
            throw new Error("quota");
          },
        },
        record,
      ),
      false,
    );

    assert.equal(
      writeBabyQuickPending(
        {
          getItem: () => '{"tampered":true}',
          setItem: () => {},
        },
        record,
      ),
      false,
    );
  });

  it("uses design storage key and migrates legacy key once", () => {
    assert.equal(BABY_QUICK_PENDING_STORAGE_KEY, "baby.quickCare.pending.v1");
    assert.equal(
      BABY_QUICK_PENDING_STORAGE_KEY_LEGACY,
      "baby.quickPending.v1",
    );

    const record = pending(shapes[2]!);
    const store: Record<string, string> = {
      [BABY_QUICK_PENDING_STORAGE_KEY_LEGACY]:
        serializeBabyQuickPending(record),
    };
    const storage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    };

    const read = readBabyQuickPending(storage, { babyId: "baby-1" });
    assert.deepEqual(read, record);
    assert.equal(store[BABY_QUICK_PENDING_STORAGE_KEY] != null, true);
    assert.equal(store[BABY_QUICK_PENDING_STORAGE_KEY_LEGACY], undefined);

    clearBabyQuickPending(storage);
    assert.equal(store[BABY_QUICK_PENDING_STORAGE_KEY], undefined);
    assert.equal(store[BABY_QUICK_PENDING_STORAGE_KEY_LEGACY], undefined);
  });

  it("never auto-retries on mount", () => {
    assert.equal(babyQuickShouldAutoRetryOnMount(), false);
  });
});

describe("babyQuickPendingOwner", () => {
  it("maps each action kind / side / group to an owner id", () => {
    assert.equal(
      babyQuickPendingOwner({ kind: "BREAST", side: "breast_l" }),
      "breast_l",
    );
    assert.equal(
      babyQuickPendingOwner({ kind: "BREAST", side: "breast_r" }),
      "breast_r",
    );
    assert.equal(
      babyQuickPendingOwner({ kind: "BREAST", side: "pump_l" }),
      "pump_l",
    );
    assert.equal(
      babyQuickPendingOwner({ kind: "BREAST", side: "pump_r" }),
      "pump_r",
    );
    assert.equal(babyQuickPendingOwner({ kind: "SLEEP" }), "nap");
    assert.equal(
      babyQuickPendingOwner({ kind: "FORMULA", amountMl: 120 }),
      "bottle",
    );
    assert.equal(
      babyQuickPendingOwner({ kind: "PUMP_AMOUNT", amountMl: 90 }),
      "pump_amount",
    );
    assert.equal(
      babyQuickPendingOwner({ kind: "DIAPER", diaperKind: "wet" }),
      "diaper",
    );
  });
});

describe("babyQuickPendingRecoveryVisible", () => {
  const young = pending({
    action: { kind: "FORMULA", amountMl: 120 },
    breastRunning: null,
  });

  it("is false while saving for sending and for unknown (Retry mid-flight)", () => {
    const sendingView = babyQuickPendingView(young, young.startedAt + 1_000);
    assert.equal(sendingView.kind, "retryable");
    assert.equal(
      babyQuickPendingRecoveryVisible({
        saving: true,
        view: sendingView,
      }),
      false,
    );

    const unknown: BabyQuickPending = { ...young, state: "unknown" };
    const unknownView = babyQuickPendingView(unknown, unknown.startedAt + 1_000);
    assert.equal(unknownView.kind, "retryable");
    assert.equal(
      babyQuickPendingRecoveryVisible({
        saving: true,
        view: unknownView,
      }),
      false,
    );
  });

  it("is true for orphaned sending when saving is false", () => {
    assert.equal(young.state, "sending");
    const view = babyQuickPendingView(young, young.startedAt + 1_000);
    assert.equal(
      babyQuickPendingRecoveryVisible({ saving: false, view }),
      true,
    );
  });

  it("is true for unknown and tooOld when saving is false", () => {
    const unknown: BabyQuickPending = { ...young, state: "unknown" };
    const unknownView = babyQuickPendingView(
      unknown,
      unknown.startedAt + 1_000,
    );
    assert.equal(
      babyQuickPendingRecoveryVisible({
        saving: false,
        view: unknownView,
      }),
      true,
    );

    const tooOldView = babyQuickPendingView(
      unknown,
      unknown.startedAt + BABY_QUICK_PENDING_RETRY_MAX_AGE_MS,
    );
    assert.equal(tooOldView.kind, "tooOld");
    assert.equal(
      babyQuickPendingRecoveryVisible({
        saving: false,
        view: tooOldView,
      }),
      true,
    );
  });

  it("is false when view is none", () => {
    assert.equal(
      babyQuickPendingRecoveryVisible({
        saving: false,
        view: { kind: "none" },
      }),
      false,
    );
  });
});
