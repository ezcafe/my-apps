import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shellNavItems } from "@/lib/features/registry";

describe("baby registry", () => {
  it("registers Baby Care with workspaceAppKey baby", () => {
    const baby = shellNavItems.find((item) => item.id === "baby");
    assert.ok(baby, "expected baby nav item");
    assert.equal(baby.kind, "feature");
    if (baby.kind !== "feature") return;
    assert.equal(baby.workspaceAppKey, "baby");
    assert.equal(baby.href, "/baby");
    assert.equal(baby.matchPrefix, "/baby");
  });
});
