import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyCareWhenParts,
  formatBabyCareClock,
  formatBabyCareWhen,
} from "@/lib/baby-format-care-when";
import { t } from "@/lib/baby-i18n";

describe("formatBabyCareClock", () => {
  it("formats local 12h time without seconds", () => {
    const d = new Date(2026, 8, 6, 15, 5, 30);
    assert.equal(formatBabyCareClock(d), "3:05 PM");
  });
});

describe("babyCareWhenParts", () => {
  const now = new Date(2026, 8, 6, 15, 0, 0); // Sat Sep 6 2026 3:00 PM

  it("returns justNow under one minute", () => {
    const at = new Date(now.getTime() - 30_000).toISOString();
    assert.deepEqual(babyCareWhenParts(at, now), { kind: "justNow" });
  });

  it("returns minutes under one hour", () => {
    const at = new Date(now.getTime() - 12 * 60_000).toISOString();
    assert.deepEqual(babyCareWhenParts(at, now), {
      kind: "minutes",
      count: 12,
    });
  });

  it("returns hours same calendar day", () => {
    const at = new Date(now.getTime() - 3 * 60 * 60_000).toISOString();
    assert.deepEqual(babyCareWhenParts(at, now), { kind: "hours", count: 3 });
  });

  it("returns yesterday with clock", () => {
    const at = new Date(2026, 8, 5, 10, 30, 0).toISOString();
    assert.deepEqual(babyCareWhenParts(at, now), {
      kind: "yesterday",
      time: "10:30 AM",
    });
  });

  it("returns null for bad iso", () => {
    assert.equal(babyCareWhenParts("not-a-date", now), null);
  });
});

describe("formatBabyCareWhen", () => {
  const now = new Date(2026, 8, 6, 15, 0, 0);

  it("formats EN relative strings", () => {
    const tenMin = new Date(now.getTime() - 10 * 60_000).toISOString();
    assert.equal(
      formatBabyCareWhen(tenMin, (k) => t(k, "en"), now, "en"),
      "10 min ago",
    );
    assert.equal(
      formatBabyCareWhen(
        new Date(now.getTime() - 30_000).toISOString(),
        (k) => t(k, "en"),
        now,
        "en",
      ),
      "Just now",
    );
  });

  it("formats VI relative strings", () => {
    const tenMin = new Date(now.getTime() - 10 * 60_000).toISOString();
    assert.equal(
      formatBabyCareWhen(tenMin, (k) => t(k, "vi"), now, "vi"),
      "10 phút trước",
    );
  });
});
