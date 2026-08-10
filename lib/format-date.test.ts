import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDisplayPeriod } from "@/lib/format-date";

describe("formatDisplayPeriod", () => {
  const from = "2026-08-01";
  const to = "2026-08-31";

  it("uses the same month-first layout for locale and mdy", () => {
    assert.equal(
      formatDisplayPeriod(from, to, "locale"),
      "Aug 1, 2026 – Aug 31, 2026",
    );
    assert.equal(
      formatDisplayPeriod(from, to, "mdy"),
      formatDisplayPeriod(from, to, "locale"),
    );
  });

  it("uses day-first order for dmy", () => {
    assert.equal(
      formatDisplayPeriod(from, to, "dmy"),
      "1 Aug 2026 – 31 Aug 2026",
    );
  });

  it("uses ISO order for ymd", () => {
    assert.equal(
      formatDisplayPeriod(from, to, "ymd"),
      "2026-08-01 – 2026-08-31",
    );
  });
});
