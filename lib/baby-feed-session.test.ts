import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BABY_BREAST_TIMER_STALE_MS } from "@/lib/baby-breast-timer-store";
import {
  BABY_FEED_POST_STOP_GRACE_MS,
  feedSessionSummaryParts,
  graceEndsAt,
  isFeedSessionMergeable,
  mergeFeedLegs,
  rollUpFeedPayload,
  type BabyFeedLeg,
} from "@/lib/baby-feed-session";

describe("baby feed session helpers", () => {
  const now = 1_700_000_000_000;

  it("graceEndsAt is stoppedAt + 5 minutes", () => {
    assert.equal(graceEndsAt(now), now + BABY_FEED_POST_STOP_GRACE_MS);
    assert.equal(graceEndsAt(now, 60_000), now + 60_000);
  });

  it("open + breastRunning still mergeable when updatedAt >5 min but <6h", () => {
    const updatedAt = now - 10 * 60 * 1000; // 10 min ago
    assert.equal(
      isFeedSessionMergeable({
        hasSessionId: true,
        breastRunning: true,
        updatedAt,
        now,
      }),
      true,
    );
  });

  it("open + breastRunning past 6h is not mergeable", () => {
    const updatedAt = now - BABY_BREAST_TIMER_STALE_MS - 1;
    assert.equal(
      isFeedSessionMergeable({
        hasSessionId: true,
        breastRunning: true,
        updatedAt,
        now,
      }),
      false,
    );
  });

  it("post-stop in grace is mergeable; expired is not", () => {
    assert.equal(
      isFeedSessionMergeable({
        hasSessionId: true,
        breastRunning: false,
        updatedAt: now - 2 * 60 * 1000,
        now,
      }),
      true,
    );
    assert.equal(
      isFeedSessionMergeable({
        hasSessionId: true,
        breastRunning: false,
        updatedAt: now - 7 * 60 * 1000,
        now,
      }),
      false,
    );
  });

  it("post-stop skew accepts client still in grace up to 6 min server delta", () => {
    assert.equal(
      isFeedSessionMergeable({
        hasSessionId: true,
        breastRunning: false,
        updatedAt: now - 5.5 * 60 * 1000,
        now,
        clientStillInGrace: true,
      }),
      true,
    );
    assert.equal(
      isFeedSessionMergeable({
        hasSessionId: true,
        breastRunning: false,
        updatedAt: now - 7 * 60 * 1000,
        now,
        clientStillInGrace: true,
      }),
      false,
    );
  });

  it("missing session id is never mergeable", () => {
    assert.equal(
      isFeedSessionMergeable({
        hasSessionId: false,
        breastRunning: true,
        updatedAt: now,
        now,
      }),
      false,
    );
  });

  it("L then R then formula rolls up with primary method formula", () => {
    const legs = mergeFeedLegs([
      { method: "breast_l", durationSec: 300 },
      { method: "breast_r", durationSec: 120 },
      { method: "formula", amountMl: 90 },
    ]);
    assert.deepEqual(legs, [
      { method: "breast_l", durationSec: 300 },
      { method: "breast_r", durationSec: 120 },
      { method: "formula", amountMl: 90 },
    ]);
    const rolled = rollUpFeedPayload(legs);
    assert.equal(rolled.method, "formula");
    assert.equal(rolled.durationSec, 420);
    assert.equal(rolled.amountMl, 90);
    assert.deepEqual(rolled.legs, legs);
  });

  it("same-method re-merge accumulates; leg count stays ≤ methods used", () => {
    const legs = mergeFeedLegs([
      { method: "breast_l", durationSec: 100 },
      { method: "breast_r", durationSec: 50 },
      { method: "breast_l", durationSec: 80 },
      { method: "formula", amountMl: 40 },
      { method: "formula", amountMl: 50 },
    ]);
    assert.equal(legs.length, 3);
    assert.deepEqual(legs, [
      { method: "breast_l", durationSec: 180 },
      { method: "breast_r", durationSec: 50 },
      { method: "formula", amountMl: 90 },
    ]);
  });

  it("omit empty legs from summary parts", () => {
    const legs: BabyFeedLeg[] = [
      { method: "breast_l", durationSec: 0 },
      { method: "breast_r", durationSec: 120 },
      { method: "formula" },
      { method: "formula", amountMl: 90 },
    ];
    const parts = feedSessionSummaryParts(legs);
    assert.deepEqual(parts, [
      { method: "breast_r", durationSec: 120 },
      { method: "formula", amountMl: 90 },
    ]);
  });
});
