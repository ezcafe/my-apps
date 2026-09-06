import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyRefetchInterval,
  babySyncIntervalMs,
  getBabySyncIntervalMinutes,
} from "@/lib/baby-sync-interval";

describe("baby sync interval", () => {
  it("defaults missing/invalid to 1 minute", () => {
    assert.equal(getBabySyncIntervalMinutes(undefined), 1);
    assert.equal(getBabySyncIntervalMinutes(""), 1);
    assert.equal(getBabySyncIntervalMinutes("nope"), 1);
    assert.equal(babySyncIntervalMs(undefined), 60_000);
  });

  it("parses env minutes", () => {
    assert.equal(getBabySyncIntervalMinutes("2"), 2);
    assert.equal(babySyncIntervalMs("2"), 120_000);
  });

  it("returns false when document hidden", () => {
    assert.equal(babyRefetchInterval(1, "hidden"), false);
    assert.equal(babyRefetchInterval(1, "visible"), 60_000);
  });
});
