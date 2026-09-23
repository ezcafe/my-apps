import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  apiTokenHasAppGrant,
  primaryAppKeyForTokenApps,
  resolveTokenApps,
} from "@/lib/api-token-grants";

describe("resolveTokenApps", () => {
  it("uses apps jsonb when present", () => {
    assert.deepEqual(
      resolveTokenApps({ appKey: "money", apps: ["baby", "money"] }),
      ["money", "baby"],
    );
  });

  it("falls back to app_key for money/baby when apps null", () => {
    assert.deepEqual(resolveTokenApps({ appKey: "money", apps: null }), [
      "money",
    ]);
    assert.deepEqual(resolveTokenApps({ appKey: "baby", apps: null }), [
      "baby",
    ]);
  });

  it("returns empty shareable grants for sav/inv legacy", () => {
    assert.deepEqual(resolveTokenApps({ appKey: "savings", apps: null }), []);
    assert.deepEqual(
      resolveTokenApps({ appKey: "investment", apps: null }),
      [],
    );
  });
});

describe("apiTokenHasAppGrant", () => {
  it("checks grant membership", () => {
    assert.equal(apiTokenHasAppGrant(["money", "baby"], "baby"), true);
    assert.equal(apiTokenHasAppGrant(["money"], "baby"), false);
  });
});

describe("primaryAppKeyForTokenApps", () => {
  it("prefers money for mny_ prefix compatibility", () => {
    assert.equal(primaryAppKeyForTokenApps(["baby"]), "money");
    assert.equal(primaryAppKeyForTokenApps(["money", "baby"]), "money");
    assert.equal(primaryAppKeyForTokenApps(["money"]), "money");
  });
});
