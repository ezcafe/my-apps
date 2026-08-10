import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  readCachedSyncedTimezone,
  timezoneSyncStorageKey,
  writeCachedSyncedTimezone,
  type TimezoneSyncStorage,
} from "@/lib/workspace-timezone";

function memoryStorage(): TimezoneSyncStorage & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("cached workspace timezone", () => {
  it("returns null without storage", () => {
    assert.equal(readCachedSyncedTimezone("ws-1", null), null);
  });

  it("round-trips the IANA zone per workspace", () => {
    const storage = memoryStorage();
    writeCachedSyncedTimezone("ws-1", "Asia/Ho_Chi_Minh", storage);
    assert.equal(readCachedSyncedTimezone("ws-1", storage), "Asia/Ho_Chi_Minh");
    assert.equal(readCachedSyncedTimezone("ws-2", storage), null);
    assert.equal(
      storage.store.get(timezoneSyncStorageKey("ws-1")),
      "Asia/Ho_Chi_Minh",
    );
  });
});
