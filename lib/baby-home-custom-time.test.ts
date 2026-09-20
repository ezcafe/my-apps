import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_HOME_NAP_DURATION_MAX,
  BABY_HOME_NAP_DURATION_MIN,
  babyHomeClearCustomClockAfterSuccess,
  babyHomeCustomClockField,
  babyHomeCustomClockMutationVars,
  babyHomeIsoToLocalInput,
  babyHomeLocalInputToIso,
  babyHomeNapEndedAtIso,
  babyLogDiaperMutationInput,
  babyLogSleepEndMutationInput,
  babyLogSleepStartMutationInput,
  clearBabyHomeCustomClockPending,
  parseBabyHomeNapDurationMinutes,
  setBabyHomeCustomClockPending,
} from "@/lib/baby-home-custom-time";

describe("babyHomeCustomClockField", () => {
  it("maps Nap idle → occurredAt; Nap running → endedAt; Diaper → occurredAt", () => {
    assert.equal(
      babyHomeCustomClockField({ target: "nap", napRunning: false }),
      "occurredAt",
    );
    assert.equal(
      babyHomeCustomClockField({ target: "nap", napRunning: true }),
      "endedAt",
    );
    assert.equal(
      babyHomeCustomClockField({ target: "diaper" }),
      "occurredAt",
    );
  });
});

describe("babyHomeCustomClockMutationVars", () => {
  const ISO = "2026-09-20T06:40:00.000+07:00";

  it("Nap idle pending → occurredAt only", () => {
    assert.deepEqual(
      babyHomeCustomClockMutationVars({
        pendingIso: ISO,
        target: "nap",
        napRunning: false,
      }),
      { occurredAt: ISO },
    );
  });

  it("Nap running pending → endedAt only", () => {
    assert.deepEqual(
      babyHomeCustomClockMutationVars({
        pendingIso: ISO,
        target: "nap",
        napRunning: true,
      }),
      { endedAt: ISO },
    );
  });

  it("Diaper pending → occurredAt only", () => {
    assert.deepEqual(
      babyHomeCustomClockMutationVars({
        pendingIso: ISO,
        target: "diaper",
      }),
      { occurredAt: ISO },
    );
  });

  it("empty pending → no time fields", () => {
    assert.deepEqual(
      babyHomeCustomClockMutationVars({
        pendingIso: null,
        target: "nap",
      }),
      {},
    );
  });
});

describe("log form mutation input builders", () => {
  const ISO = "2026-09-20T06:40:00.000+07:00";

  it("diaper create spreads occurredAt from pending", () => {
    assert.deepEqual(
      babyLogDiaperMutationInput({ kind: "wet", pendingIso: ISO }),
      { kind: "wet", occurredAt: ISO },
    );
  });

  it("sleep start spreads occurredAt; sleep end spreads endedAt", () => {
    assert.deepEqual(babyLogSleepStartMutationInput(ISO), {
      occurredAt: ISO,
    });
    assert.deepEqual(babyLogSleepEndMutationInput(ISO), { endedAt: ISO });
  });
});

describe("set/clear pending clock", () => {
  it("set replaces; clear returns null; clear-after-success matches target", () => {
    assert.equal(setBabyHomeCustomClockPending(null, "a"), "a");
    assert.equal(clearBabyHomeCustomClockPending(), null);
    assert.equal(
      babyHomeClearCustomClockAfterSuccess({
        pendingTarget: "nap",
        savedTarget: "nap",
      }),
      true,
    );
    assert.equal(
      babyHomeClearCustomClockAfterSuccess({
        pendingTarget: "nap",
        savedTarget: "diaper",
      }),
      false,
    );
  });
});

describe("local datetime round-trip helpers", () => {
  it("iso ↔ local input stay parseable", () => {
    const iso = "2026-09-20T06:40:00.000Z";
    const local = babyHomeIsoToLocalInput(iso);
    assert.match(local, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    const back = babyHomeLocalInputToIso(local);
    assert.ok(Number.isFinite(Date.parse(back)));
  });
});

describe("babyHomeNapEndedAtIso", () => {
  it("computes endedAt from start ISO + duration minutes", () => {
    const start = "2026-09-20T06:40:00.000Z";
    const ended = babyHomeNapEndedAtIso({
      startIso: start,
      durationMinutes: 30,
    });
    assert.equal(Date.parse(ended), Date.parse(start) + 30 * 60_000);
  });
});

describe("parseBabyHomeNapDurationMinutes", () => {
  it("accepts integers in range; rejects empty/out of range", () => {
    assert.deepEqual(parseBabyHomeNapDurationMinutes("45"), {
      ok: true,
      minutes: 45,
    });
    assert.deepEqual(parseBabyHomeNapDurationMinutes(String(BABY_HOME_NAP_DURATION_MIN)), {
      ok: true,
      minutes: BABY_HOME_NAP_DURATION_MIN,
    });
    assert.deepEqual(parseBabyHomeNapDurationMinutes(String(BABY_HOME_NAP_DURATION_MAX)), {
      ok: true,
      minutes: BABY_HOME_NAP_DURATION_MAX,
    });
    assert.equal(parseBabyHomeNapDurationMinutes("").ok, false);
    assert.equal(parseBabyHomeNapDurationMinutes("0").ok, false);
    assert.equal(parseBabyHomeNapDurationMinutes("481").ok, false);
    assert.equal(parseBabyHomeNapDurationMinutes("12.5").ok, false);
  });
});
