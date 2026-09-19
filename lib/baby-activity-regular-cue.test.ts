import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { babyActivityRegularCue } from "@/lib/baby-activity-regular-cue";

describe("babyActivityRegularCue", () => {
  it("unknown age → none border", () => {
    const cue = babyActivityRegularCue(
      {
        source: "care",
        careType: "feed",
        at: "2026-01-01T12:00:00.000Z",
        payload: { method: "formula", amountMl: 120 },
      },
      null,
    );
    assert.equal(cue.family, "feed");
    assert.equal(cue.border, "none");
    assert.equal(cue.fillRatio, null);
  });

  it("open sleep → none border", () => {
    const cue = babyActivityRegularCue(
      {
        source: "care",
        careType: "sleep",
        at: "2026-01-01T12:00:00.000Z",
        endedAt: null,
      },
      60,
    );
    assert.equal(cue.family, "sleep");
    assert.equal(cue.border, "none");
    assert.equal(cue.fillRatio, null);
  });

  it("ml below / near / above feed band (1–3mo: 90–150)", () => {
    const base = {
      source: "care" as const,
      careType: "feed" as const,
      at: "2026-01-01T12:00:00.000Z",
    };
    // ageDays 45 → 1–3 months band
    assert.equal(
      babyActivityRegularCue(
        { ...base, payload: { method: "formula", amountMl: 60 } },
        45,
      ).border,
      "below",
    );
    assert.equal(
      babyActivityRegularCue(
        { ...base, payload: { method: "formula", amountMl: 120 } },
        45,
      ).border,
      "near",
    );
    assert.equal(
      babyActivityRegularCue(
        { ...base, payload: { method: "formula", amountMl: 200 } },
        45,
      ).border,
      "above",
    );
  });

  it("sleep duration banding + fill ratio vs mid band", () => {
    // age 10 → 0–1mo band 20–120 mid=70; 10m logged → below, fill≈10/70
    const cue = babyActivityRegularCue(
      {
        source: "care",
        careType: "sleep",
        at: "2026-01-01T12:00:00.000Z",
        endedAt: "2026-01-01T12:10:00.000Z",
      },
      10,
    );
    assert.equal(cue.family, "sleep");
    assert.equal(cue.border, "below");
    assert.ok(cue.fillRatio != null);
    assert.ok(Math.abs(cue.fillRatio! - 10 / 70) < 0.001);
  });

  it("fill ratio is 0.5 when logged is half the mid band", () => {
    // 1–3y sleep band 60–180 mid=120; 60 min → near, fill=0.5
    const cue = babyActivityRegularCue(
      {
        source: "care",
        careType: "sleep",
        at: "2026-01-01T12:00:00.000Z",
        endedAt: "2026-01-01T13:00:00.000Z",
      },
      800,
    );
    assert.equal(cue.border, "near");
    assert.equal(cue.fillRatio, 0.5);
  });

  it("diaper → type only, no comparison", () => {
    const cue = babyActivityRegularCue(
      {
        source: "care",
        careType: "diaper",
        at: "2026-01-01T12:00:00.000Z",
        payload: { kind: "wet" },
      },
      45,
    );
    assert.equal(cue.family, "diaper");
    assert.equal(cue.border, "none");
    assert.equal(cue.fillRatio, null);
  });
});
