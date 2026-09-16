import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveMilkToDiaperLagKpi,
  deriveSleepEfficiencyKpi,
  deriveWakeWindowKpi,
} from "@/lib/baby-insights-insight-kpis";

describe("insight KPI helpers", () => {
  it("Sleep efficiency always soft empty need_night_waking_logs", () => {
    const result = deriveSleepEfficiencyKpi(
      [
        {
          type: "sleep",
          at: "2026-09-14T22:00:00",
          endedAt: "2026-09-15T06:00:00",
        },
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-16" },
    );
    assert.deepEqual(result, { emptyReason: "need_night_waking_logs" });
    assert.equal("efficiencyPct" in result, false);
  });

  it("Wake-window soft empty when range <3 local days", () => {
    const result = deriveWakeWindowKpi(
      [
        {
          type: "sleep",
          at: "2026-09-14T10:00:00",
          endedAt: "2026-09-14T11:00:00",
        },
        {
          type: "sleep",
          at: "2026-09-14T14:00:00",
          endedAt: "2026-09-14T15:00:00",
        },
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-15" },
    );
    // 2 local days → need_3_days (not the thin-sleep reason).
    assert.equal(result.emptyReason, "need_3_days");
  });

  it("Wake-window soft empty when fewer than 2 completed sleeps", () => {
    const result = deriveWakeWindowKpi(
      [
        {
          type: "sleep",
          at: "2026-09-14T10:00:00",
          endedAt: "2026-09-14T11:00:00",
        },
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-16" },
    );
    assert.equal(result.emptyReason, "need_more_sleep_logs");
  });

  it("Milk→diaper soft empty when no eligible pair within 6h", () => {
    const result = deriveMilkToDiaperLagKpi(
      [
        { type: "feed", at: "2026-09-14T10:00:00", payload: {} },
        {
          type: "diaper",
          at: "2026-09-14T18:00:00",
          payload: { kind: "wet" },
        },
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-14", maxLagHours: 6 },
    );
    assert.ok(result.emptyReason);
    assert.equal("avgLagMinutes" in result, false);
  });

  it("wake window happy path mean", () => {
    const result = deriveWakeWindowKpi(
      [
        {
          type: "sleep",
          at: "2026-09-14T08:00:00",
          endedAt: "2026-09-14T09:00:00",
        },
        {
          type: "sleep",
          at: "2026-09-14T11:00:00",
          endedAt: "2026-09-14T12:00:00",
        },
        {
          type: "sleep",
          at: "2026-09-15T08:00:00",
          endedAt: "2026-09-15T09:00:00",
        },
        {
          type: "sleep",
          at: "2026-09-16T08:00:00",
          endedAt: "2026-09-16T09:00:00",
        },
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-16" },
    );
    // gaps: 120m + 1200m + 1380m → mean 900
    assert.deepEqual(result, { avgMinutes: 900 });
  });

  it("milk→diaper lag happy path", () => {
    const result = deriveMilkToDiaperLagKpi(
      [
        { type: "feed", at: "2026-09-14T10:00:00", payload: {} },
        {
          type: "diaper",
          at: "2026-09-14T11:30:00",
          payload: { kind: "wet" },
        },
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-14", maxLagHours: 6 },
    );
    assert.equal("avgLagMinutes" in result, true);
    if ("avgLagMinutes" in result) {
      assert.equal(result.avgLagMinutes, 90);
    }
  });
});
