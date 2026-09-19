import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatBabyDurationCompact,
  formatBabyDurationLocale,
  formatBabyDurationTimer,
} from "@/lib/baby-format-duration";

describe("formatBabyDurationCompact", () => {
  it("formats minutes only under one hour", () => {
    assert.equal(formatBabyDurationCompact(12 * 60), "12m");
    assert.equal(formatBabyDurationCompact(60), "1m");
  });

  it("formats hours and remaining minutes", () => {
    assert.equal(formatBabyDurationCompact(65 * 60), "1h 5m");
    assert.equal(formatBabyDurationCompact(60 * 60), "1h");
    assert.equal(formatBabyDurationCompact(125 * 60), "2h 5m");
  });

  it("handles zero and sub-minute sensibly", () => {
    assert.equal(formatBabyDurationCompact(0), "0m");
    assert.equal(formatBabyDurationCompact(30), "0m");
    assert.equal(formatBabyDurationCompact(59), "0m");
  });

  it("floors fractional seconds to whole minutes", () => {
    assert.equal(formatBabyDurationCompact(90), "1m");
  });
});

describe("formatBabyDurationTimer", () => {
  it("shows minutes and seconds as m:ss", () => {
    assert.equal(formatBabyDurationTimer(0), "0:00");
    assert.equal(formatBabyDurationTimer(5), "0:05");
    assert.equal(formatBabyDurationTimer(65), "1:05");
    assert.equal(formatBabyDurationTimer(12 * 60 + 30), "12:30");
  });

  it("includes hours as h:mm:ss when ≥ 1 hour", () => {
    assert.equal(formatBabyDurationTimer(60 * 60), "1:00:00");
    assert.equal(formatBabyDurationTimer(65 * 60 + 7), "1:05:07");
  });
});

describe("formatBabyDurationLocale", () => {
  it("formats EN next-due / overdue compact (no spaces in units)", () => {
    assert.equal(formatBabyDurationLocale(5 * 60, "en"), "5min");
    assert.equal(formatBabyDurationLocale(60 * 60, "en"), "1h");
    assert.equal(formatBabyDurationLocale(65 * 60, "en"), "1h 5min");
    assert.equal(formatBabyDurationLocale(5.5 * 60 * 60, "en"), "5h 30min");
  });

  it("formats VI with phút and giờ", () => {
    assert.equal(formatBabyDurationLocale(5 * 60, "vi"), "5 phút");
    assert.equal(formatBabyDurationLocale(60 * 60, "vi"), "1 giờ");
    assert.equal(formatBabyDurationLocale(65 * 60, "vi"), "1 giờ 5 phút");
  });
});
