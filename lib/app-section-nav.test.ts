import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APP_SECTION_NAV,
  appSectionItemsByGroup,
  resolveAppSectionFromPath,
  visibleAppSectionItems,
} from "@/lib/app-section-nav";

describe("resolveAppSectionFromPath", () => {
  it("maps product prefixes", () => {
    assert.equal(resolveAppSectionFromPath("/money/insights"), "money");
    assert.equal(resolveAppSectionFromPath("/investments"), "investments");
    assert.equal(resolveAppSectionFromPath("/loans/new"), "loans");
    assert.equal(resolveAppSectionFromPath("/baby"), "baby");
    assert.equal(resolveAppSectionFromPath("/baby/feed"), "baby");
  });

  it("returns null on core shell routes", () => {
    assert.equal(resolveAppSectionFromPath("/help"), null);
    assert.equal(resolveAppSectionFromPath("/settings"), null);
  });
});

describe("baby app section", () => {
  it("lists capture and browse items plus settings", () => {
    const items = visibleAppSectionItems("baby", () => true);
    assert.deepEqual(
      items.map((item) => item.href),
      [
        "/baby",
        "/baby/insights",
        "/baby/feed",
        "/baby/sleep",
        "/baby/diaper",
        "/baby/measure",
        "/baby/vaccines",
        "/baby/settings",
      ],
    );
    assert.ok(!items.some((item) => item.href === "/baby/growth"));
    assert.ok(!items.some((item) => item.href === "/baby/timeline"));
  });

  it("uses dedicated Baby icon ids (not Money bills/import/spending)", () => {
    const items = visibleAppSectionItems("baby", () => true);
    const icons = Object.fromEntries(items.map((i) => [i.href, i.icon]));
    assert.equal(icons["/baby"], "babyHome");
    assert.equal(icons["/baby/insights"], "babyInsights");
    assert.equal(icons["/baby/feed"], "babyFeed");
    assert.equal(icons["/baby/sleep"], "babySleep");
    assert.equal(icons["/baby/diaper"], "babyDiaper");
    assert.equal(icons["/baby/measure"], "babyMeasure");
    assert.equal(icons["/baby/vaccines"], "babyVaccine");
    assert.equal(icons["/baby/settings"], "babySettings");
    assert.ok(!Object.values(icons).includes("bills"));
    assert.ok(!Object.values(icons).includes("import"));
    assert.ok(!Object.values(icons).includes("spending"));
  });
});

describe("visibleAppSectionItems", () => {
  it("hides optional Money ledgers when disabled", () => {
    const items = visibleAppSectionItems("money", (key) => key == null);
    assert.deepEqual(
      items.map((item) => item.label),
      [
        "Spending",
        "Insights",
        "Add transaction",
        "Settings",
      ],
    );
  });

  it("lists all default investment menu items including import", () => {
    const items = visibleAppSectionItems("investments", (key) => key == null);
    assert.deepEqual(
      items.map((item) => item.label),
      [
        "Investments",
        "Insights",
        "Record activity",
        "Instruments",
        "Import",
        "Settings",
      ],
    );
  });
});

describe("appSectionItemsByGroup", () => {
  it("preserves browse before review", () => {
    const groups = appSectionItemsByGroup(APP_SECTION_NAV.loans.items);
    assert.deepEqual(
      groups.map(({ group }) => group),
      ["browse", "review", "capture", "configure"],
    );
  });
});
