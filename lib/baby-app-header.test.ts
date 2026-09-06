import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveBabyAppHeader } from "@/lib/baby-app-header";

describe("resolveBabyAppHeader", () => {
  it("maps home and nested routes to i18n title keys", () => {
    assert.equal(resolveBabyAppHeader("/baby").titleKey, "home.title");
    assert.equal(resolveBabyAppHeader("/baby/feed").titleKey, "feed.title");
    assert.equal(resolveBabyAppHeader("/baby/sleep").titleKey, "sleep.title");
    assert.equal(resolveBabyAppHeader("/baby/diaper").titleKey, "diaper.title");
    assert.equal(
      resolveBabyAppHeader("/baby/insights").titleKey,
      "insights.title",
    );
    assert.equal(
      resolveBabyAppHeader("/baby/measure").titleKey,
      "measure.title",
    );
    assert.equal(
      resolveBabyAppHeader("/baby/vaccines").titleKey,
      "vaccine.title",
    );
    assert.equal(
      resolveBabyAppHeader("/baby/settings").titleKey,
      "settings.title",
    );
  });

  it("adds home crumb on nested routes only", () => {
    assert.deepEqual(resolveBabyAppHeader("/baby").breadcrumbs, []);
    assert.deepEqual(resolveBabyAppHeader("/baby/insights").breadcrumbs, [
      { labelKey: "home.title", href: "/baby" },
      { labelKey: "insights.title" },
    ]);
    assert.deepEqual(resolveBabyAppHeader("/baby/measure").breadcrumbs, [
      { labelKey: "home.title", href: "/baby" },
      { labelKey: "measure.title" },
    ]);
  });
});
