import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_BREAST_TIMER_STALE_MS,
  BABY_BREAST_TIMER_STORAGE_KEY,
  BABY_CARE_TIMER_STORAGE_KEY,
  babyBreastElapsedSec,
  babyCareTimerStopFeedInput,
  parseBabyBreastTimer,
  readBabyCareTimer,
  serializeBabyBreastTimer,
  startBabyCareTimer,
  writeBabyCareTimer,
} from "@/lib/baby-breast-timer-store";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
    raw: map,
  };
}

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

  it("stop feed input maps side + floors duration (≥1s)", () => {
    assert.deepEqual(babyCareTimerStopFeedInput("pump_l", 1000, 1000), {
      method: "pump_l",
      durationSec: 1,
    });
    assert.deepEqual(babyCareTimerStopFeedInput("pump_l", 1000, 4500), {
      method: "pump_l",
      durationSec: 3,
    });
    assert.deepEqual(babyCareTimerStopFeedInput("breast_r", 0, 10_000), {
      method: "breast_r",
      durationSec: 10,
    });
  });

  it("accepts pump_l side and rejects unknown side", () => {
    const pump = {
      babyId: "baby-1",
      side: "pump_l" as const,
      startedAt: 1_700_000_000_000,
    };
    const parsed = parseBabyBreastTimer(serializeBabyBreastTimer(pump), {
      babyId: "baby-1",
      now: pump.startedAt + 1_000,
    });
    assert.deepEqual(parsed?.timer, pump);

    assert.equal(
      parseBabyBreastTimer(
        JSON.stringify({
          babyId: "baby-1",
          side: "nope",
          startedAt: 1,
        }),
        { babyId: "baby-1", now: 0 },
      ),
      null,
    );
  });

  it("startBabyCareTimer replaces any prior side (one running)", () => {
    const first = startBabyCareTimer({
      babyId: "baby-1",
      side: "breast_r",
      now: 1000,
    });
    assert.equal(first.side, "breast_r");
    const next = startBabyCareTimer({
      babyId: "baby-1",
      side: "pump_l",
      now: 2000,
    });
    assert.equal(next.side, "pump_l");
    assert.equal(next.startedAt, 2000);
  });

  it("migrates in-flight breastTimer.v1 into careTimer.v1 dual slots", () => {
    const storage = memoryStorage({
      [BABY_BREAST_TIMER_STORAGE_KEY]: serializeBabyBreastTimer(timer),
    });
    const read = readBabyCareTimer(storage, {
      babyId: "baby-1",
      now: timer.startedAt + 5_000,
    });
    assert.deepEqual(read?.timer, timer);
    assert.equal(
      storage.getItem(BABY_CARE_TIMER_STORAGE_KEY),
      JSON.stringify({
        babyId: "baby-1",
        breast: { side: "breast_l", startedAt: timer.startedAt },
        pump: null,
      }),
    );
    assert.equal(storage.getItem(BABY_BREAST_TIMER_STORAGE_KEY), null);

    writeBabyCareTimer(storage, null);
    assert.equal(storage.getItem(BABY_CARE_TIMER_STORAGE_KEY), null);
  });
});
