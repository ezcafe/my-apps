import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearBabyFeedSessionHandle,
  parseBabyFeedSessionHandle,
  serializeBabyFeedSessionHandle,
  shouldClearFeedSessionHandle,
  type BabyFeedSessionHandle,
} from "@/lib/baby-feed-session-store";

describe("baby feed session store", () => {
  const handle: BabyFeedSessionHandle = {
    babyId: "baby-1",
    eventId: "11111111-1111-1111-1111-111111111111",
    graceEndsAtMs: null,
  };

  it("serialize → parse round-trips with grace null while open", () => {
    const raw = serializeBabyFeedSessionHandle(handle);
    const parsed = parseBabyFeedSessionHandle(raw, {
      babyId: "baby-1",
      now: 1_700_000_000_000,
    });
    assert.deepEqual(parsed, handle);
  });

  it("stop sets graceEndsAtMs; parse returns handle while in grace", () => {
    const stopped: BabyFeedSessionHandle = {
      ...handle,
      graceEndsAtMs: 1_700_000_300_000,
    };
    const parsed = parseBabyFeedSessionHandle(
      serializeBabyFeedSessionHandle(stopped),
      { babyId: "baby-1", now: 1_700_000_200_000 },
    );
    assert.deepEqual(parsed, stopped);
  });

  it("expired grace clears merge handle (parse returns null)", () => {
    const stopped: BabyFeedSessionHandle = {
      ...handle,
      graceEndsAtMs: 1_700_000_100_000,
    };
    assert.equal(
      parseBabyFeedSessionHandle(serializeBabyFeedSessionHandle(stopped), {
        babyId: "baby-1",
        now: 1_700_000_100_001,
      }),
      null,
    );
    assert.equal(
      shouldClearFeedSessionHandle(stopped, 1_700_000_100_001),
      true,
    );
  });

  it("wrong babyId ignored", () => {
    assert.equal(
      parseBabyFeedSessionHandle(serializeBabyFeedSessionHandle(handle), {
        babyId: "other",
        now: 0,
      }),
      null,
    );
  });

  it("clear helper returns empty string sentinel for storage wipe", () => {
    assert.equal(clearBabyFeedSessionHandle(), "");
  });

  it("rejects bad input", () => {
    assert.equal(
      parseBabyFeedSessionHandle(null, { babyId: "baby-1", now: 0 }),
      null,
    );
    assert.equal(
      parseBabyFeedSessionHandle("{", { babyId: "baby-1", now: 0 }),
      null,
    );
    assert.equal(
      parseBabyFeedSessionHandle(
        JSON.stringify({ babyId: "baby-1", eventId: "not-uuid" }),
        { babyId: "baby-1", now: 0 },
      ),
      null,
    );
  });
});
