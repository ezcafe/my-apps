import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adoptBabyHomeFeedSessionAfterQuickCare,
  readBabyHomeFeedSession,
  writeBabyHomeFeedSession,
  BABY_FEED_SESSION_STORAGE_KEY,
} from "@/lib/baby-home-feed-session";
import { serializeBabyFeedSessionHandle } from "@/lib/baby-feed-session-store";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
    raw: map,
  };
}

describe("baby-home-feed-session", () => {
  it("read/write round-trip and clear", () => {
    const storage = memoryStorage();
    const handle = {
      babyId: "baby-1",
      eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      graceEndsAtMs: 1_700_000_300_000 as number | null,
    };
    writeBabyHomeFeedSession(storage, handle);
    assert.equal(
      readBabyHomeFeedSession(storage, {
        babyId: "baby-1",
        now: 1_700_000_000_000,
      })?.eventId,
      handle.eventId,
    );
    writeBabyHomeFeedSession(storage, null);
    assert.equal(storage.raw.has(BABY_FEED_SESSION_STORAGE_KEY), false);
  });

  it("adopt clears grace on breast restart and persists", () => {
    const id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const storage = memoryStorage({
      [BABY_FEED_SESSION_STORAGE_KEY]: serializeBabyFeedSessionHandle({
        babyId: "baby-1",
        eventId: id,
        graceEndsAtMs: 1_700_000_300_000,
      }),
    });
    const previous = readBabyHomeFeedSession(storage, {
      babyId: "baby-1",
      now: 1_700_000_000_000,
    });
    const next = adoptBabyHomeFeedSessionAfterQuickCare({
      babyId: "baby-1",
      now: 1_700_000_060_000,
      previous,
      localAfter: {
        clearBreastTimer: false,
        startBreastSide: "breast_r",
        stopBreastSession: false,
      },
      steps: [],
      storage,
    });
    assert.equal(next?.eventId, id);
    assert.equal(next?.graceEndsAtMs, null);
    assert.equal(
      readBabyHomeFeedSession(storage, {
        babyId: "baby-1",
        now: 1_700_000_400_000,
      })?.eventId,
      id,
    );
  });
});
