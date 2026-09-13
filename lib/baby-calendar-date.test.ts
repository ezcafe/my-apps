import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyCalendarDayNumber,
  parseBabyCalendarDate,
} from "@/lib/baby-calendar-date";

describe("parseBabyCalendarDate", () => {
  it("accepts real YYYY-MM-DD dates including leap day", () => {
    assert.deepEqual(parseBabyCalendarDate("2026-07-04"), {
      year: 2026,
      month: 7,
      day: 4,
    });
    assert.deepEqual(parseBabyCalendarDate("2024-02-29"), {
      year: 2024,
      month: 2,
      day: 29,
    });
  });

  it("rejects impossible and non-leap dates (parts must round-trip)", () => {
    for (const raw of [
      "2026-02-30",
      "2026-04-31",
      "2026-13-01",
      "2026-00-10",
      "2023-02-29",
      "2100-02-29",
    ]) {
      assert.equal(parseBabyCalendarDate(raw), null, raw);
    }
  });

  it("rejects wrong formats and non-strings", () => {
    for (const raw of [
      "2026-7-4",
      "04/07/2026",
      "2026-07-04T00:00:00Z",
      "",
      null,
      undefined,
      20260704,
    ]) {
      assert.equal(parseBabyCalendarDate(raw as never), null, String(raw));
    }
  });

  it("trims surrounding whitespace before parsing", () => {
    assert.deepEqual(parseBabyCalendarDate("  2026-07-04  "), {
      year: 2026,
      month: 7,
      day: 4,
    });
  });
});

describe("babyCalendarDayNumber", () => {
  it("gives consecutive integers across month end, year end, and Feb 29", () => {
    const a = babyCalendarDayNumber({ year: 2026, month: 1, day: 31 });
    const b = babyCalendarDayNumber({ year: 2026, month: 2, day: 1 });
    assert.equal(b - a, 1);

    const y1 = babyCalendarDayNumber({ year: 2025, month: 12, day: 31 });
    const y2 = babyCalendarDayNumber({ year: 2026, month: 1, day: 1 });
    assert.equal(y2 - y1, 1);

    const leap = babyCalendarDayNumber({ year: 2024, month: 2, day: 28 });
    const leapDay = babyCalendarDayNumber({ year: 2024, month: 2, day: 29 });
    const after = babyCalendarDayNumber({ year: 2024, month: 3, day: 1 });
    assert.equal(leapDay - leap, 1);
    assert.equal(after - leapDay, 1);
  });
});
