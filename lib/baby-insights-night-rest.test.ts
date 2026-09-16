import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveNightRestSeries,
  type BabyNightRestCareItem,
} from "@/lib/baby-insights-night-rest";

function sleep(
  occurredAt: string,
  endedAt: string | null,
): BabyNightRestCareItem {
  return { type: "sleep", at: occurredAt, endedAt };
}

describe("deriveNightRestSeries", () => {
  it("overnight clip: 22:00→06:00 counts overlap with night window only; no efficiency %", () => {
    // Night ending morning of 2026-09-15: [2026-09-14 19:00, 2026-09-15 08:00)
    // Sleep 22:00→06:00 = 8h = 480 minutes, fully inside window
    const result = deriveNightRestSeries(
      [sleep("2026-09-14T22:00:00", "2026-09-15T06:00:00")],
      { fromDate: "2026-09-15", toDate: "2026-09-15" },
    );
    assert.equal(result.emptyReason, undefined);
    assert.equal(result.days.length, 1);
    const day = result.days[0]!;
    assert.equal(day.date, "2026-09-15");
    assert.equal(day.nightSleepMinutes, 480);
    assert.equal(day.intervalCount, 1);
    assert.equal(
      "efficiencyPct" in day || "efficiency" in day || "sleepEfficiency" in day,
      false,
    );
  });

  it("clips sleep that extends outside the night window", () => {
    // Sleep 17:00 → 09:00 overlaps [19:00, 08:00) = 13 hours = 780 min
    const result = deriveNightRestSeries(
      [sleep("2026-09-14T17:00:00", "2026-09-15T09:00:00")],
      { fromDate: "2026-09-15", toDate: "2026-09-15" },
    );
    assert.equal(result.days[0]!.nightSleepMinutes, 13 * 60);
  });

  it("excludes open sleep (endedAt null)", () => {
    const result = deriveNightRestSeries(
      [sleep("2026-09-14T22:00:00", null)],
      { fromDate: "2026-09-15", toDate: "2026-09-15" },
    );
    assert.equal(result.emptyReason, "need_more_sleep_logs");
    assert.equal(result.days.length, 0);
  });

  it("counts multi-block intervalCount", () => {
    const result = deriveNightRestSeries(
      [
        sleep("2026-09-14T20:00:00", "2026-09-14T23:00:00"),
        sleep("2026-09-15T01:00:00", "2026-09-15T06:00:00"),
      ],
      { fromDate: "2026-09-15", toDate: "2026-09-15" },
    );
    assert.equal(result.days[0]!.intervalCount, 2);
    assert.equal(result.days[0]!.nightSleepMinutes, 3 * 60 + 5 * 60);
  });

  it("soft empty when no night sleep", () => {
    const result = deriveNightRestSeries(
      [sleep("2026-09-15T10:00:00", "2026-09-15T11:00:00")],
      { fromDate: "2026-09-15", toDate: "2026-09-15" },
    );
    assert.equal(result.emptyReason, "need_more_sleep_logs");
  });
});
