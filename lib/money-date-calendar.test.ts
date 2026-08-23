import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addCalendarMonths,
  calendarMonthCells,
  parseLocalDateString,
  toLocalDateString,
} from "@/lib/money-date-calendar";

describe("calendarMonthCells", () => {
  it("returns 42 cells and includes the first and last day of August 2026", () => {
    const cells = calendarMonthCells(2026, 7);
    assert.equal(cells.length, 42);
    assert.ok(cells.some((c) => c.date === "2026-08-01" && c.inMonth));
    assert.ok(cells.some((c) => c.date === "2026-08-31" && c.inMonth));
  });

  it("pads leading days from the previous month (Monday start)", () => {
    // 1 Aug 2026 is Saturday → 5 leading days (Mon–Fri of late July)
    const cells = calendarMonthCells(2026, 7);
    assert.equal(cells[0]?.date, "2026-07-27");
    assert.equal(cells[0]?.inMonth, false);
    assert.equal(cells[5]?.date, "2026-08-01");
    assert.equal(cells[5]?.inMonth, true);
  });
});

describe("parseLocalDateString / toLocalDateString", () => {
  it("round-trips a calendar date", () => {
    const d = parseLocalDateString("2026-08-23");
    assert.ok(d);
    assert.equal(toLocalDateString(d), "2026-08-23");
  });

  it("rejects invalid calendar dates", () => {
    assert.equal(parseLocalDateString("2026-02-31"), null);
    assert.equal(parseLocalDateString("nope"), null);
  });
});

describe("addCalendarMonths", () => {
  it("rolls the year", () => {
    assert.deepEqual(addCalendarMonths(2026, 11, 1), {
      year: 2027,
      monthIndex: 0,
    });
  });
});
