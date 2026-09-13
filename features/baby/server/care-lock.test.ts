import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_CARE_LOCK_SUFFIX,
  withBabyCareLock,
  type BabyCareLockDeps,
  type BabyCareTx,
} from "@/features/baby/server/care-lock";

describe("withBabyCareLock", () => {
  it("acquires the advisory lock before the callback runs", async () => {
    // Stubbed call-order only — does NOT prove the lock. Live race suites do.
    const order: string[] = [];
    const fakeTx = { execute: async () => undefined } as BabyCareTx;
    const deps: BabyCareLockDeps = {
      transaction: async (fn) => {
        order.push("transaction");
        return fn(fakeTx);
      },
      acquire: async (_tx, workspaceId) => {
        order.push(`acquire:${workspaceId}${BABY_CARE_LOCK_SUFFIX}`);
      },
    };
    await withBabyCareLock(
      "ws-1",
      async () => {
        order.push("run");
        return 42;
      },
      deps,
    );
    assert.deepEqual(order, [
      "transaction",
      "acquire:ws-1:baby-care",
      "run",
    ]);
  });
});
