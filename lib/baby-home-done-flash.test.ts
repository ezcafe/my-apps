import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_HOME_DONE_MS,
  babyHomeBottleDoneMl,
  babyHomeBreastDoneSide,
  babyHomeDiaperDoneKind,
  babyHomeSleepDoneFlash,
  createBabyHomeDoneFlashTimer,
  scheduleBabyHomeDoneClear,
} from "@/lib/baby-home-done-flash";

describe("babyHomeDiaperDoneKind", () => {
  it("returns any saved kind for tile Done flash (wet/dry/dirty/mixed)", () => {
    assert.equal(babyHomeDiaperDoneKind("wet"), "wet");
    assert.equal(babyHomeDiaperDoneKind("dry"), "dry");
    assert.equal(babyHomeDiaperDoneKind("dirty"), "dirty");
    assert.equal(babyHomeDiaperDoneKind("mixed"), "mixed");
    assert.equal(babyHomeDiaperDoneKind(null), null);
    assert.equal(babyHomeDiaperDoneKind(undefined), null);
    assert.equal(babyHomeDiaperDoneKind("nope"), null);
  });
});

describe("babyHomeBreastDoneSide", () => {
  it("flashes only when the press fully stops breast (second click)", () => {
    assert.equal(
      babyHomeBreastDoneSide({
        stopBreastSession: true,
        side: "breast_l",
      }),
      "breast_l",
    );
    assert.equal(
      babyHomeBreastDoneSide({
        stopBreastSession: true,
        side: "breast_r",
      }),
      "breast_r",
    );
    assert.equal(
      babyHomeBreastDoneSide({
        stopBreastSession: true,
        side: "pump_l",
      }),
      "pump_l",
    );
    assert.equal(
      babyHomeBreastDoneSide({
        stopBreastSession: false,
        side: "breast_l",
      }),
      null,
    );
  });
});

describe("babyHomeSleepDoneFlash", () => {
  it("flashes only after End/stop — never after Start while session runs", () => {
    assert.equal(
      babyHomeSleepDoneFlash({ endedSleepSession: true }),
      true,
    );
    assert.equal(
      babyHomeSleepDoneFlash({ endedSleepSession: false }),
      false,
    );
  });
});

describe("babyHomeBottleDoneMl", () => {
  it("keeps positive saved ml for flash; rejects invalid", () => {
    assert.equal(babyHomeBottleDoneMl(90), 90);
    assert.equal(babyHomeBottleDoneMl(120), 120);
    assert.equal(babyHomeBottleDoneMl(0), null);
    assert.equal(babyHomeBottleDoneMl(-1), null);
    assert.equal(babyHomeBottleDoneMl(null), null);
    assert.equal(babyHomeBottleDoneMl(undefined), null);
    assert.equal(babyHomeBottleDoneMl(Number.NaN), null);
  });
});

describe("scheduleBabyHomeDoneClear", () => {
  it("clears after BABY_HOME_DONE_MS via injectable timer", () => {
    assert.equal(BABY_HOME_DONE_MS, 2000);
    const calls: Array<{ fn: () => void; ms: number }> = [];
    let cleared = false;
    const id = scheduleBabyHomeDoneClear(
      () => {
        cleared = true;
      },
      ((fn: () => void, ms: number) => {
        calls.push({ fn, ms });
        return 1 as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout,
    );
    assert.equal(id, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.ms, BABY_HOME_DONE_MS);
    assert.equal(cleared, false);
    calls[0]?.fn();
    assert.equal(cleared, true);
  });
});

describe("createBabyHomeDoneFlashTimer", () => {
  it("default host does not call timers as methods (browser this)", () => {
    // Browsers throw TypeError: Illegal invocation when window.setTimeout is
    // extracted onto a host object and called as host.setTimeout(...).
    const calls: number[] = [];
    const browserishSetTimeout = function (
      this: unknown,
      fn: () => void,
      ms: number,
    ) {
      if (this != null && this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }
      calls.push(ms);
      fn();
      return 1 as unknown as ReturnType<typeof setTimeout>;
    } as typeof setTimeout;

    const prevSet = globalThis.setTimeout;
    const prevClear = globalThis.clearTimeout;
    try {
      globalThis.setTimeout = browserishSetTimeout;
      globalThis.clearTimeout = ((id: ReturnType<typeof setTimeout>) => {
        void id;
      }) as typeof clearTimeout;

      const timer = createBabyHomeDoneFlashTimer();
      let cleared = false;
      timer.arm(() => {
        cleared = true;
      }, 50);
      assert.deepEqual(calls, [50]);
      assert.equal(cleared, true);
    } finally {
      globalThis.setTimeout = prevSet;
      globalThis.clearTimeout = prevClear;
    }
  });

  it("clears previous timeout before arming again", () => {
    const clearedIds: unknown[] = [];
    const armed: Array<{ fn: () => void; ms: number; id: number }> = [];
    let nextId = 1;
    const timer = createBabyHomeDoneFlashTimer({
      setTimeout: ((fn: () => void, ms: number) => {
        const id = nextId++;
        armed.push({ fn, ms, id });
        return id as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout,
      clearTimeout: ((id: ReturnType<typeof setTimeout>) => {
        clearedIds.push(id);
      }) as typeof clearTimeout,
    });

    let clearCount = 0;
    timer.arm(() => {
      clearCount += 1;
    });
    assert.equal(armed.length, 1);
    assert.equal(armed[0]?.ms, BABY_HOME_DONE_MS);

    timer.arm(() => {
      clearCount += 1;
    });
    assert.deepEqual(clearedIds, [1]);
    assert.equal(armed.length, 2);

    // Stale first callback must not run after re-arm.
    armed[0]?.fn();
    assert.equal(clearCount, 0);

    armed[1]?.fn();
    assert.equal(clearCount, 1);
  });

  it("dispose clears pending timeout so clear never fires", () => {
    const clearedIds: unknown[] = [];
    let pending: (() => void) | null = null;
    const timer = createBabyHomeDoneFlashTimer({
      setTimeout: ((fn: () => void) => {
        pending = fn;
        return 42 as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout,
      clearTimeout: ((id: ReturnType<typeof setTimeout>) => {
        clearedIds.push(id);
        pending = null;
      }) as typeof clearTimeout,
    });

    let fired = false;
    timer.arm(() => {
      fired = true;
    });
    timer.dispose();
    assert.deepEqual(clearedIds, [42]);
    assert.equal(pending, null);
    assert.equal(fired, false);

    // dispose again is a no-op
    timer.dispose();
    assert.deepEqual(clearedIds, [42]);
  });
});
