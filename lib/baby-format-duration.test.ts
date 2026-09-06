import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatBabyDurationCompact } from "@/lib/baby-format-duration";

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
