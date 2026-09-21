import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SHAREABLE_WORKSPACE_APP_KEYS,
  isShareableWorkspaceAppKey,
  parseShareableWorkspaceAppKeys,
} from "@/lib/workspace-shareable-apps";

describe("SHAREABLE_WORKSPACE_APP_KEYS", () => {
  it("includes money and baby only", () => {
    assert.deepEqual([...SHAREABLE_WORKSPACE_APP_KEYS], ["money", "baby"]);
  });

  it("accepts money and baby", () => {
    assert.equal(isShareableWorkspaceAppKey("money"), true);
    assert.equal(isShareableWorkspaceAppKey("baby"), true);
  });

  it("rejects notes, tasks, and unknown keys", () => {
    assert.equal(isShareableWorkspaceAppKey("notes"), false);
    assert.equal(isShareableWorkspaceAppKey("tasks"), false);
    assert.equal(isShareableWorkspaceAppKey("swole"), false);
  });

  it("parseShareableWorkspaceAppKeys requires at least one shareable app", () => {
    assert.deepEqual(parseShareableWorkspaceAppKeys(["money"]), ["money"]);
    assert.deepEqual(parseShareableWorkspaceAppKeys(["baby", "money"]), [
      "money",
      "baby",
    ]);
    assert.throws(() => parseShareableWorkspaceAppKeys([]), /at least one/i);
    assert.throws(() => parseShareableWorkspaceAppKeys(["notes"]), /shareable/i);
    assert.throws(
      () => parseShareableWorkspaceAppKeys(["money", "notes"]),
      /shareable/i,
    );
  });
});
