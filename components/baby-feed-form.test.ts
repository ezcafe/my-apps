import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  BABY_CARE_TIMER_STORAGE_KEY,
  emptyBabyCareTimerSlots,
  readBabyCareTimerSlots,
  withCareTimerSide,
  writeBabyCareTimerSlots,
} from "@/lib/baby-breast-timer-store";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("BabyFeedForm source chrome", () => {
  const src = readFileSync(
    resolve(process.cwd(), "components/baby-feed-form.tsx"),
    "utf8",
  );

  it("uses shared breast pair + ml section; no pump sides or amount Field", () => {
    assert.match(src, /BabyBreastSidePair/);
    assert.match(src, /BabyMlChipSection/);
    assert.match(src, /BabyCustomMlModal/);
    assert.doesNotMatch(src, /BabyPumpSidePair/);
    assert.doesNotMatch(src, /pump_l/);
    assert.doesNotMatch(src, /feed\.amountMl/);
    assert.doesNotMatch(src, /AMOUNT_METHODS/);
  });

  it("matches Pump page grid: asContents breast pair + ml in one row", () => {
    assert.match(src, /asContents/);
    assert.match(src, /items-stretch/);
    assert.match(src, /minmax\(min\(100%, 8rem\), 1fr\)/);
    assert.match(src, /BABY_CARE_TIMER_CLIENT_ID/);
    assert.doesNotMatch(src, /baby_id=/);
  });

  it("saves formula via createBabyFeed method formula", () => {
    assert.match(src, /method:\s*"formula"/);
  });

  it("Custom Done flash wires keep-from-custom helper into customSelected", () => {
    assert.match(src, /babyHomeKeepFromCustomAfterAmountSuccess/);
    assert.match(src, /resolveBabyHomeCustomSelected/);
    assert.match(src, /customSelected=\{bottleCustomSelected\}/);
    assert.doesNotMatch(src, /customSelected=\{false\}/);
    assert.match(
      src,
      /setFormulaFromCustom\(keepFromCustom\)/,
    );
  });
});

describe("Feed breast slot write leaves pump intact", () => {
  it("withCareTimerSide breast start keeps existing pump", () => {
    const storage = memoryStorage();
    const babyId = "b1";
    let slots = emptyBabyCareTimerSlots(babyId);
    slots = withCareTimerSide(slots, {
      babyId,
      side: "pump_l",
      now: 1000,
    });
    writeBabyCareTimerSlots(storage, slots);
    slots = withCareTimerSide(slots, {
      babyId,
      side: "breast_r",
      now: 2000,
    });
    writeBabyCareTimerSlots(storage, slots);
    const parsed = readBabyCareTimerSlots(storage, { babyId, now: 2000 });
    assert.equal(parsed?.slots.pump?.side, "pump_l");
    assert.equal(parsed?.slots.breast?.side, "breast_r");
    assert.equal(storage.getItem(BABY_CARE_TIMER_STORAGE_KEY) != null, true);
  });
});

describe("Home → Feed timer sync via shared client id", () => {
  it("Feed reads breast running when Home wrote BABY_CARE_TIMER_CLIENT_ID", async () => {
    const { BABY_CARE_TIMER_CLIENT_ID } = await import(
      "@/lib/baby-breast-timer-store"
    );
    const storage = memoryStorage();
    const startedAt = 1_700_000_000_000;
    writeBabyCareTimerSlots(
      storage,
      withCareTimerSide(emptyBabyCareTimerSlots(BABY_CARE_TIMER_CLIENT_ID), {
        babyId: BABY_CARE_TIMER_CLIENT_ID,
        side: "breast_l",
        now: startedAt,
      }),
    );
    // Wrong id (old Feed cookie fallback) must NOT see Home timer.
    assert.equal(
      readBabyCareTimerSlots(storage, {
        babyId: "feed",
        now: startedAt + 5_000,
      })?.slots.breast ?? null,
      null,
    );
    const fromFeed = readBabyCareTimerSlots(storage, {
      babyId: BABY_CARE_TIMER_CLIENT_ID,
      now: startedAt + 5_000,
    });
    assert.equal(fromFeed?.slots.breast?.side, "breast_l");
    assert.equal(fromFeed?.slots.breast?.startedAt, startedAt);
  });
});
