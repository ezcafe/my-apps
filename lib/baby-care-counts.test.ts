import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateCareCountsByDay,
  aggregateSeriesCareCounts,
  babyCareCountChartCopy,
  babyCareCountChartCopyFromSeries,
  careCountDayKey,
} from "@/lib/baby-care-counts";
import { toLocalDateString } from "@/lib/money-date-calendar";

describe("aggregateCareCountsByDay", () => {
  it("counts feed/sleep/diaper by day and ignores growth", () => {
    const out = aggregateCareCountsByDay([
      { kind: "care", type: "feed", at: "2026-09-06T08:00:00.000Z" },
      { kind: "care", type: "feed", at: "2026-09-06T12:00:00.000Z" },
      { kind: "care", type: "sleep", at: "2026-09-06T13:00:00.000Z" },
      { kind: "care", type: "diaper", at: "2026-09-05T10:00:00.000Z" },
      { kind: "growth", type: "weight", at: "2026-09-06T09:00:00.000Z" },
    ]);
    assert.deepEqual(out, [
      {
        day: careCountDayKey("2026-09-05T10:00:00.000Z"),
        feed: 0,
        sleep: 0,
        diaper: 1,
      },
      {
        day: careCountDayKey("2026-09-06T08:00:00.000Z"),
        feed: 2,
        sleep: 1,
        diaper: 0,
      },
    ]);
  });

  it("returns empty for empty input", () => {
    assert.deepEqual(aggregateCareCountsByDay([]), []);
  });

  it("exposes feed/sleep/diaper series keys for chart legend selection", () => {
    const days = aggregateCareCountsByDay([
      { kind: "care", type: "feed", at: "2026-09-06T08:00:00.000Z" },
    ]);
    assert.equal(days.length, 1);
    const day = days[0]!;
    assert.deepEqual(
      (["feed", "sleep", "diaper"] as const).map((key) => ({
        key,
        value: day[key],
      })),
      [
        { key: "feed", value: 1 },
        { key: "sleep", value: 0 },
        { key: "diaper", value: 0 },
      ],
    );
  });

  it("buckets by local calendar day, not UTC ISO date", () => {
    const iso = "2026-09-06T22:30:00.000Z";
    const local = toLocalDateString(new Date(iso));
    const utc = new Date(iso).toISOString().slice(0, 10);
    const out = aggregateCareCountsByDay([
      { kind: "care", type: "feed", at: iso },
    ]);
    assert.equal(out[0]?.day, local);
    assert.equal(careCountDayKey(iso), local);
    if (local !== utc) {
      assert.notEqual(out[0]?.day, utc);
    }
  });
});

describe("aggregateSeriesCareCounts", () => {
  it("sums applied-range days and skips lookback outside fromDate", () => {
    const out = aggregateSeriesCareCounts(
      [
        { type: "sleep", at: "2026-09-14T19:30:00" },
        { type: "feed", at: "2026-09-15T08:00:00" },
        { type: "feed", at: "2026-09-15T12:00:00" },
        { type: "diaper", at: "2026-09-15T09:00:00" },
      ],
      "2026-09-15",
      "2026-09-15",
    );
    assert.deepEqual(out, {
      feeds: 2,
      sleep: 0,
      diapers: 1,
      days: [
        {
          day: "2026-09-15",
          feed: 2,
          sleep: 0,
          diaper: 1,
        },
      ],
    });
  });
});

describe("babyCareCountChartCopyFromSeries", () => {
  it("never marks series days partial", () => {
    assert.equal(babyCareCountChartCopyFromSeries(0), "empty");
    assert.equal(babyCareCountChartCopyFromSeries(2), "ready");
  });
});

describe("babyCareCountChartCopy", () => {
  it("never claims empty while the timeline is incomplete", () => {
    assert.equal(
      babyCareCountChartCopy({
        dayCount: 0,
        timelineIncomplete: true,
        canLoadMore: true,
      }),
      "partial",
    );
    assert.equal(
      babyCareCountChartCopy({
        dayCount: 0,
        timelineIncomplete: false,
        canLoadMore: false,
      }),
      "empty",
    );
  });

  it("flags partial when days exist but more timeline pages remain", () => {
    assert.equal(
      babyCareCountChartCopy({
        dayCount: 3,
        timelineIncomplete: true,
        canLoadMore: true,
      }),
      "partial",
    );
    assert.equal(
      babyCareCountChartCopy({
        dayCount: 3,
        timelineIncomplete: false,
        canLoadMore: false,
      }),
      "ready",
    );
  });

  it("uses capped copy when incomplete but Load more is not available", () => {
    assert.equal(
      babyCareCountChartCopy({
        dayCount: 2,
        timelineIncomplete: true,
        canLoadMore: false,
      }),
      "partialCapped",
    );
    assert.equal(
      babyCareCountChartCopy({
        dayCount: 0,
        timelineIncomplete: true,
        canLoadMore: false,
      }),
      "partialCapped",
    );
  });
});
