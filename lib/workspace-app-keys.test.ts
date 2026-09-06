import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WORKSPACE_APP_KEYS } from "@/db/schema/workspace";

describe("WORKSPACE_APP_KEYS", () => {
  it("includes baby", () => {
    assert.ok(
      (WORKSPACE_APP_KEYS as readonly string[]).includes("baby"),
      'expected WORKSPACE_APP_KEYS to include "baby"',
    );
  });
});
