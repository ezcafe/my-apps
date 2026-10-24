import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shellNavItems } from "@/lib/features/registry";
import { WORKSPACE_APP_KEYS } from "@/db/schema/workspace";

describe("foods registry", () => {
  it("registers Foods with workspaceAppKey foods", () => {
    assert.ok((WORKSPACE_APP_KEYS as readonly string[]).includes("foods"));
    const foods = shellNavItems.find((item) => item.id === "foods");
    assert.ok(foods, "expected foods nav item");
    assert.equal(foods.kind, "feature");
    if (foods.kind !== "feature") return;
    assert.equal(foods.workspaceAppKey, "foods");
    assert.equal(foods.href, "/foods");
    assert.equal(foods.matchPrefix, "/foods");
  });
});
