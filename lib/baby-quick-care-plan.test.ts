import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_AUTO_FINALIZE_NOW,
  BABY_AUTO_FINALIZE_TABLE,
} from "@/lib/baby-quick-care-order-fixture";
import {
  adoptFeedSessionAfterQuickCare,
  babyQuickCareStepMessageKey,
  localAfterFromQuickRequest,
  planBabyQuickCare,
} from "@/lib/baby-quick-care-plan";

describe("localAfterFromQuickRequest", () => {
  it("matches planBabyQuickCare localAfter for every auto-finalize row (retry path)", () => {
    for (const row of BABY_AUTO_FINALIZE_TABLE) {
      const planned = planBabyQuickCare(row.action, {
        breast: row.breast,
        now: BABY_AUTO_FINALIZE_NOW,
      });
      assert.deepEqual(
        localAfterFromQuickRequest(planned.request),
        planned.localAfter,
        row.id,
      );
      assert.deepEqual(
        localAfterFromQuickRequest(planned.request),
        row.expectLocalAfter,
        `${row.id} fixture`,
      );
    }
  });

  it("clears timer on retry when press had breastRunning (stop / switch / bottle)", () => {
    assert.deepEqual(
      localAfterFromQuickRequest({
        action: { kind: "BREAST", side: "breast_l" },
        breastRunning: { side: "breast_l", durationSec: 40 },
      }),
      {
        clearBreastTimer: true,
        startBreastSide: null,
        stopBreastSession: true,
      },
    );
    assert.deepEqual(
      localAfterFromQuickRequest({
        action: { kind: "BREAST", side: "breast_r" },
        breastRunning: { side: "breast_l", durationSec: 40 },
      }),
      {
        clearBreastTimer: true,
        startBreastSide: "breast_r",
        stopBreastSession: false,
      },
    );
    assert.deepEqual(
      localAfterFromQuickRequest({
        action: { kind: "FORMULA", amountMl: 120 },
        breastRunning: { side: "breast_r", durationSec: 12 },
      }),
      {
        clearBreastTimer: true,
        startBreastSide: null,
        stopBreastSession: true,
      },
    );
  });

  it("starts timer on idle breast retry even when steps would be non-empty (nap)", () => {
    assert.deepEqual(
      localAfterFromQuickRequest({
        action: { kind: "BREAST", side: "breast_l" },
        breastRunning: null,
      }),
      {
        clearBreastTimer: false,
        startBreastSide: "breast_l",
        stopBreastSession: false,
      },
    );
  });
});

describe("planBabyQuickCare", () => {
  it("returns exactly request and localAfter — no third key", () => {
    const planned = planBabyQuickCare(
      { kind: "SLEEP" },
      { breast: null, now: BABY_AUTO_FINALIZE_NOW },
    );
    assert.deepEqual(Object.keys(planned).sort(), ["localAfter", "request"]);
    assert.equal("expectedSteps" in planned, false);
  });

  it("covers every auto-finalize table row for request + localAfter", () => {
    for (const row of BABY_AUTO_FINALIZE_TABLE) {
      const planned = planBabyQuickCare(row.action, {
        breast: row.breast,
        now: BABY_AUTO_FINALIZE_NOW,
      });
      assert.deepEqual(
        planned.request.breastRunning,
        row.expectBreastRunning,
        row.id,
      );
      assert.deepEqual(planned.request.action, row.action, row.id);
      assert.deepEqual(planned.localAfter, row.expectLocalAfter, row.id);
    }
  });

  it("action carries only the fields the pressed kind needs", () => {
    const breast = planBabyQuickCare(
      { kind: "BREAST", side: "breast_l" },
      { breast: null, now: 0 },
    );
    assert.deepEqual(breast.request.action, {
      kind: "BREAST",
      side: "breast_l",
    });

    const formula = planBabyQuickCare(
      { kind: "FORMULA", amountMl: 95 },
      { breast: null, now: 0 },
    );
    assert.deepEqual(formula.request.action, {
      kind: "FORMULA",
      amountMl: 95,
    });

    const diaper = planBabyQuickCare(
      { kind: "DIAPER", diaperKind: "dirty" },
      { breast: null, now: 0 },
    );
    assert.deepEqual(diaper.request.action, {
      kind: "DIAPER",
      diaperKind: "dirty",
    });

    const sleep = planBabyQuickCare(
      { kind: "SLEEP" },
      { breast: null, now: 0 },
    );
    assert.deepEqual(sleep.request.action, { kind: "SLEEP" });
  });

  it("floors durationSec at 1 when now ≈ startedAt (sub-second)", () => {
    const startedAt = BABY_AUTO_FINALIZE_NOW;
    const planned = planBabyQuickCare(
      { kind: "BREAST", side: "breast_l" },
      {
        breast: { side: "breast_l", startedAt },
        now: startedAt + 400,
      },
    );
    assert.equal(planned.request.breastRunning?.durationSec, 1);
  });

  it("includes feedSessionEventId only on feed-writing presses", () => {
    const sid = "11111111-1111-4111-8111-111111111111";
    const withId = planBabyQuickCare(
      { kind: "FORMULA", amountMl: 90 },
      { breast: null, now: 0, feedSessionEventId: sid },
    );
    assert.equal(withId.request.feedSessionEventId, sid);

    const breastSave = planBabyQuickCare(
      { kind: "BREAST", side: "breast_r" },
      {
        breast: { side: "breast_l", startedAt: 0 },
        now: 40_000,
        feedSessionEventId: sid,
      },
    );
    assert.equal(breastSave.request.feedSessionEventId, sid);

    const diaper = planBabyQuickCare(
      { kind: "DIAPER", diaperKind: "wet" },
      { breast: null, now: 0, feedSessionEventId: sid },
    );
    assert.equal(diaper.request.feedSessionEventId, undefined);
  });

  it("omits feedSessionEventId when store has none", () => {
    const planned = planBabyQuickCare(
      { kind: "FORMULA", amountMl: 90 },
      { breast: null, now: 0, feedSessionEventId: null },
    );
    assert.equal(planned.request.feedSessionEventId, undefined);
  });
});

describe("adoptFeedSessionAfterQuickCare", () => {
  it("adopts new id when server inserts under sticky request id", () => {
    const oldId = "22222222-2222-4222-8222-222222222222";
    const newId = "33333333-3333-4333-8333-333333333333";
    const next = adoptFeedSessionAfterQuickCare({
      babyId: "baby-1",
      now: 1_700_000_000_000,
      previous: {
        babyId: "baby-1",
        eventId: oldId,
        graceEndsAtMs: 1_700_000_100_000,
      },
      localAfter: {
        clearBreastTimer: true,
        startBreastSide: null,
        stopBreastSession: true,
      },
      steps: [
        {
          step: "saveBreast",
          wrote: "insert",
          event: { id: newId, type: "feed" },
        },
      ],
    });
    assert.equal(next?.eventId, newId);
    assert.notEqual(next?.eventId, oldId);
    assert.ok(next?.graceEndsAtMs != null);
  });

  it("keeps same id on update and sets grace on stop", () => {
    const id = "44444444-4444-4444-8444-444444444444";
    const next = adoptFeedSessionAfterQuickCare({
      babyId: "baby-1",
      now: 1_700_000_000_000,
      previous: { babyId: "baby-1", eventId: id, graceEndsAtMs: null },
      localAfter: {
        clearBreastTimer: true,
        startBreastSide: null,
        stopBreastSession: true,
      },
      steps: [
        {
          step: "createFormula",
          wrote: "update",
          event: { id, type: "feed" },
        },
      ],
    });
    assert.equal(next?.eventId, id);
    assert.equal(next?.graceEndsAtMs, 1_700_000_000_000 + 5 * 60 * 1000);
  });

  it("clears grace on timer-only breast restart (no feed steps)", () => {
    const id = "55555555-5555-4555-8555-555555555555";
    const graceEndsAtMs = 1_700_000_000_000 + 5 * 60 * 1000;
    const next = adoptFeedSessionAfterQuickCare({
      babyId: "baby-1",
      now: 1_700_000_060_000,
      previous: { babyId: "baby-1", eventId: id, graceEndsAtMs },
      localAfter: {
        clearBreastTimer: false,
        startBreastSide: "breast_l",
        stopBreastSession: false,
      },
      steps: [],
    });
    assert.equal(next?.eventId, id);
    assert.equal(next?.graceEndsAtMs, null);
  });
});

describe("babyQuickCareStepMessageKey", () => {
  it("returns a distinct key per step name", () => {
    const keys = [
      "saveBreast",
      "endNap",
      "startNap",
      "createFormula",
      "createDiaper",
    ].map((s) =>
      babyQuickCareStepMessageKey(s as Parameters<typeof babyQuickCareStepMessageKey>[0]),
    );
    assert.equal(new Set(keys).size, keys.length);
  });
});
