import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveAwakeWindowTrendSeries,
  deriveDiaperOutputSeries,
  derivePatternFinderSeries,
} from "@/lib/baby-insights-deferred-series";

describe("deriveDiaperOutputSeries", () => {
  it("kind:wet → Wet bucket only (not hydration wet+mixed)", () => {
    const result = deriveDiaperOutputSeries(
      [
        { type: "diaper", at: "2026-09-14T10:00:00", payload: { kind: "wet" } },
        {
          type: "diaper",
          at: "2026-09-14T11:00:00",
          payload: { kind: "mixed", texture: "soft" },
        },
        {
          type: "diaper",
          at: "2026-09-14T12:00:00",
          payload: { kind: "dirty", texture: "seedy" },
        },
        {
          type: "diaper",
          at: "2026-09-14T13:00:00",
          payload: { kind: "dirty", texture: "mushy" },
        },
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-14" },
    );
    assert.equal(result.emptyReason, undefined);
    // wet kind alone — mixed/dirty with texture go to stool buckets, not Wet
    assert.equal(result.buckets?.wet, 1);
    assert.equal(result.buckets?.normal, 3);
  });

  it("dirty + watery + blowout increments watery and blowouts", () => {
    const result = deriveDiaperOutputSeries(
      [
        {
          type: "diaper",
          at: "2026-09-14T10:00:00",
          payload: { kind: "dirty", texture: "soft" },
        },
        {
          type: "diaper",
          at: "2026-09-14T11:00:00",
          payload: { kind: "dirty", texture: "seedy" },
        },
        {
          type: "diaper",
          at: "2026-09-14T12:00:00",
          payload: {
            kind: "dirty",
            texture: "watery",
            amount: "blowout",
          },
        },
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-14" },
    );
    assert.equal(result.buckets?.watery, 1);
    assert.equal(result.buckets?.blowouts, 1);
    assert.equal(result.buckets?.normal, 2);
  });

  it("dirty missing texture ignored", () => {
    const result = deriveDiaperOutputSeries(
      [
        {
          type: "diaper",
          at: "2026-09-14T10:00:00",
          payload: { kind: "dirty" },
        },
        {
          type: "diaper",
          at: "2026-09-14T11:00:00",
          payload: { kind: "dirty", texture: "soft" },
        },
        {
          type: "diaper",
          at: "2026-09-14T12:00:00",
          payload: { kind: "dirty", texture: "seedy" },
        },
        {
          type: "diaper",
          at: "2026-09-14T13:00:00",
          payload: { kind: "dirty", texture: "mushy" },
        },
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-14" },
    );
    assert.equal(result.buckets?.normal, 3);
    assert.equal(result.emptyReason, undefined);
  });

  it("<3 textured samples → soft empty", () => {
    const result = deriveDiaperOutputSeries(
      [
        {
          type: "diaper",
          at: "2026-09-14T10:00:00",
          payload: { kind: "dirty", texture: "soft" },
        },
        {
          type: "diaper",
          at: "2026-09-14T11:00:00",
          payload: { kind: "wet" },
        },
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-14" },
    );
    assert.equal(result.emptyReason, "need_more_texture_logs");
  });

  it("watery share >20% → alert when enough samples", () => {
    const result = deriveDiaperOutputSeries(
      [
        {
          type: "diaper",
          at: "2026-09-14T10:00:00",
          payload: { kind: "dirty", texture: "soft" },
        },
        {
          type: "diaper",
          at: "2026-09-14T11:00:00",
          payload: { kind: "dirty", texture: "watery" },
        },
        {
          type: "diaper",
          at: "2026-09-14T12:00:00",
          payload: { kind: "dirty", texture: "watery" },
        },
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-14" },
    );
    // watery 2 of stool denom (soft+watery+watery = 3) → ~66% > 20%
    assert.equal(result.alert, "high_watery");
  });
});

describe("deriveAwakeWindowTrendSeries", () => {
  it("short range soft empty", () => {
    const result = deriveAwakeWindowTrendSeries(
      [
        {
          type: "sleep",
          at: "2026-09-14T08:00:00",
          endedAt: "2026-09-14T09:00:00",
        },
        {
          type: "sleep",
          at: "2026-09-14T12:00:00",
          endedAt: "2026-09-14T13:00:00",
        },
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-15" },
    );
    // 2 local days → need_3_days (not the thin-sleep reason).
    assert.equal(result.emptyReason, "need_3_days");
  });

  it("multi-day points + rolling omit until ≥3 day-points", () => {
    const result = deriveAwakeWindowTrendSeries(
      [
        {
          type: "sleep",
          at: "2026-09-14T08:00:00",
          endedAt: "2026-09-14T09:00:00",
        },
        {
          type: "sleep",
          at: "2026-09-14T12:00:00",
          endedAt: "2026-09-14T13:00:00",
        },
        {
          type: "sleep",
          at: "2026-09-15T08:00:00",
          endedAt: "2026-09-15T09:00:00",
        },
        {
          type: "sleep",
          at: "2026-09-15T12:00:00",
          endedAt: "2026-09-15T13:00:00",
        },
        {
          type: "sleep",
          at: "2026-09-16T08:00:00",
          endedAt: "2026-09-16T09:00:00",
        },
        {
          type: "sleep",
          at: "2026-09-16T12:00:00",
          endedAt: "2026-09-16T13:00:00",
        },
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-16", rollingDays: 7 },
    );
    assert.equal(result.emptyReason, undefined);
    assert.equal(result.days?.length, 3);
    // Day means: same-day 3h gap (180) plus overnight into next day (1140) → 660.
    assert.equal(result.days![0]!.meanWakeMinutes, 180);
    assert.equal(result.days![1]!.meanWakeMinutes, 660);
    assert.equal(result.days![2]!.meanWakeMinutes, 660);
    // Rolling only once ≥3 day-points exist in the trailing window.
    assert.equal(result.days![0]!.rollingMeanWakeMinutes, undefined);
    assert.equal(result.days![1]!.rollingMeanWakeMinutes, undefined);
    assert.equal(result.days![2]!.rollingMeanWakeMinutes, 500);
  });
});

describe("derivePatternFinderSeries", () => {
  it("<2 days with markers → need_more_logs", () => {
    const result = derivePatternFinderSeries(
      [
        { type: "feed", at: "2026-09-14T10:00:00", payload: {} },
        {
          type: "sleep",
          at: "2026-09-14T12:00:00",
          endedAt: "2026-09-14T13:00:00",
        },
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-16" },
    );
    assert.equal(result.emptyReason, "need_more_logs");
  });

  it("returns matrix shape for multi-day markers", () => {
    const result = derivePatternFinderSeries(
      [
        { type: "feed", at: "2026-09-14T10:00:00", payload: {} },
        {
          type: "sleep",
          at: "2026-09-14T22:00:00",
          endedAt: "2026-09-15T02:00:00",
        },
        { type: "diaper", at: "2026-09-15T08:00:00", payload: { kind: "wet" } },
      ],
      { fromDate: "2026-09-14", toDate: "2026-09-15" },
    );
    assert.equal(result.emptyReason, undefined);
    assert.ok((result.days?.length ?? 0) >= 2);
    assert.ok(Array.isArray(result.days![0]!.sleepBlocks));
    assert.ok(Array.isArray(result.days![0]!.markers));
  });
});
