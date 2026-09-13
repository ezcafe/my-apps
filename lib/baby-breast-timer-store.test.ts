import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_BREAST_TIMER_STALE_MS,
  babyBreastElapsedSec,
  parseBabyBreastTimer,
  serializeBabyBreastTimer,
} from "@/lib/baby-breast-timer-store";

describe("baby breast timer store", () => {
  const timer = {
    babyId: "baby-1",
    side: "breast_l" as const,
    startedAt: 1_700_000_000_000,
  };

  it("serialize → parse round-trips", () => {
    const raw = serializeBabyBreastTimer(timer);
    const parsed = parseBabyBreastTimer(raw, {
      babyId: "baby-1",
      now: timer.startedAt + 60_000,
    });
    assert.deepEqual(parsed?.timer, timer);
    assert.equal(parsed?.stale, false);
  });

  it("parse returns null for bad input or different babyId", () => {
    assert.equal(
      parseBabyBreastTimer(null, { babyId: "baby-1", now: 0 }),
      null,
    );
    assert.equal(
      parseBabyBreastTimer("", { babyId: "baby-1", now: 0 }),
      null,
    );
    assert.equal(
      parseBabyBreastTimer("{", { babyId: "baby-1", now: 0 }),
      null,
    );
    assert.equal(
      parseBabyBreastTimer(
        JSON.stringify({ babyId: "baby-1", side: "breast_l" }),
        { babyId: "baby-1", now: 0 },
      ),
      null,
    );
    assert.equal(
      parseBabyBreastTimer(serializeBabyBreastTimer(timer), {
        babyId: "other",
        now: 0,
      }),
      null,
    );
  });

  it("stale timers are returned with stale: true, never dropped", () => {
    const parsed = parseBabyBreastTimer(serializeBabyBreastTimer(timer), {
      babyId: "baby-1",
      now: timer.startedAt + BABY_BREAST_TIMER_STALE_MS + 1,
    });
    assert.equal(parsed?.stale, true);
    assert.deepEqual(parsed?.timer, timer);
  });

  it("elapsed sec never goes negative", () => {
    assert.equal(babyBreastElapsedSec(1000, 500), 0);
    assert.equal(babyBreastElapsedSec(1000, 3500), 2);
  });
});
