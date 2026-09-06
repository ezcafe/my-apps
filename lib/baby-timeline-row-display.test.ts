import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyTimelineDurationLabel,
  babyTimelineStopAtIso,
  babyTimelineSummaryLabel,
  formatBabyTimelineStopClock,
} from "@/lib/baby-timeline-row-display";

describe("babyTimelineStopAtIso", () => {
  it("uses endedAt for closed sleep and at for feed", () => {
    assert.equal(
      babyTimelineStopAtIso({
        kind: "care",
        type: "sleep",
        at: "2026-09-06T12:00:00.000Z",
        endedAt: "2026-09-06T12:12:00.000Z",
        summary: "Ended sleep · 12m",
      }),
      "2026-09-06T12:12:00.000Z",
    );
    assert.equal(
      babyTimelineStopAtIso({
        kind: "care",
        type: "feed",
        at: "2026-09-06T08:00:00.000Z",
        endedAt: null,
        summary: "Feed (Breast L) · 12m",
      }),
      "2026-09-06T08:00:00.000Z",
    );
  });
});

describe("babyTimelineSummaryLabel", () => {
  it("strips trailing compact duration so Insights can show it once beside stop", () => {
    assert.equal(
      babyTimelineSummaryLabel("Feed (Breast L) · 12m"),
      "Feed (Breast L)",
    );
    assert.equal(
      babyTimelineSummaryLabel("Ended sleep · 1h 5m"),
      "Ended sleep",
    );
    assert.equal(
      babyTimelineSummaryLabel("Diaper (wet)"),
      "Diaper (wet)",
    );
  });
});

describe("babyTimelineDurationLabel", () => {
  it("reads compact duration from summary when present", () => {
    assert.equal(
      babyTimelineDurationLabel({
        kind: "care",
        type: "feed",
        at: "2026-09-06T08:00:00.000Z",
        endedAt: null,
        summary: "Feed (Breast L) · 12m",
      }),
      "12m",
    );
  });

  it("uses payload durationSec when summary has no duration", () => {
    assert.equal(
      babyTimelineDurationLabel({
        kind: "care",
        type: "feed",
        at: "2026-09-06T08:00:00.000Z",
        endedAt: null,
        summary: "Feed (Breast L)",
        payload: { method: "breast_l", durationSec: 720 },
      }),
      "12m",
    );
    assert.equal(
      babyTimelineDurationLabel({
        kind: "care",
        type: "feed",
        at: "2026-09-06T08:00:00.000Z",
        endedAt: null,
        summary: "Feed (Breast L)",
        payload: { method: "breast_l", durationSec: 3900 },
      }),
      "1h 5m",
    );
  });

  it("derives sleep duration from endedAt − at", () => {
    assert.equal(
      babyTimelineDurationLabel({
        kind: "care",
        type: "sleep",
        at: "2026-09-06T12:00:00.000Z",
        endedAt: "2026-09-06T12:12:00.000Z",
        summary: "Ended sleep",
        payload: {},
      }),
      "12m",
    );
  });

  it("returns null when duration is missing (open sleep / diaper / no payload)", () => {
    assert.equal(
      babyTimelineDurationLabel({
        kind: "care",
        type: "sleep",
        at: "2026-09-06T12:00:00.000Z",
        endedAt: null,
        summary: "Sleep started",
        payload: {},
      }),
      null,
    );
    assert.equal(
      babyTimelineDurationLabel({
        kind: "care",
        type: "diaper",
        at: "2026-09-06T08:00:00.000Z",
        endedAt: null,
        summary: "Diaper (wet)",
        payload: { kind: "wet" },
      }),
      null,
    );
    assert.equal(
      babyTimelineDurationLabel({
        kind: "care",
        type: "feed",
        at: "2026-09-06T08:00:00.000Z",
        endedAt: null,
        summary: "Feed (Breast L)",
        payload: { method: "breast_l" },
      }),
      null,
    );
  });
});

describe("formatBabyTimelineStopClock", () => {
  it("formats a short clock without year dump", () => {
    const out = formatBabyTimelineStopClock(
      "2026-09-06T08:05:00.000Z",
      "en-US",
    );
    // Must look like a clock (HH:MM), never a full date dump with year.
    assert.match(out, /\d{1,2}:\d{2}/);
    assert.ok(!out.includes("2026"));
    assert.ok(!/september|sep/i.test(out));
  });
});
