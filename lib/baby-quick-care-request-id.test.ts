import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { newBabyQuickRequestId } from "@/lib/baby-quick-care-request-id";

describe("newBabyQuickRequestId", () => {
  it("returns a fresh uuid per call", () => {
    const a = newBabyQuickRequestId();
    const b = newBabyQuickRequestId();
    assert.notEqual(a, b);
    assert.match(a, /^[0-9a-f-]{36}$/i);
  });
});
