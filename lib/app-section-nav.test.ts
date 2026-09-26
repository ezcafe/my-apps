import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APP_NAV_GROUP_LABELS,
  APP_NAV_GROUP_ORDER,
  APP_SECTION_NAV,
  appSectionItemsByGroup,
  resolveAppSectionFromPath,
  visibleAppSectionItems,
  type AppNavGroup,
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
  it("lists capture and browse items plus settings (no Log vaccines)", () => {
    const items = visibleAppSectionItems("baby", () => true);
    assert.deepEqual(
      items.map((item) => item.href),
      [
        "/baby",
        "/baby/insights",
        "/baby/activities",
        "/baby/feed",
        "/baby/pump",
        "/baby/sleep",
        "/baby/diaper",
        "/baby/growth",
        "/baby/settings",
      ],
    );
    assert.ok(!items.some((item) => item.href === "/baby/measure"));
    assert.ok(!items.some((item) => item.href === "/baby/timeline"));
    assert.ok(!items.some((item) => item.href === "/baby/vaccines"));
    assert.ok(!items.some((item) => item.label === "Log vaccines"));
    assert.equal(
      items.find((item) => item.href === "/baby/growth")?.label,
      "Log growth",
    );
  });

  it("places Activities in review group next to Insights", () => {
    const review = APP_SECTION_NAV.baby.items.filter(
      (item) => item.group === "review",
    );
    assert.deepEqual(
      review.map((item) => item.href),
      ["/baby/insights", "/baby/activities"],
    );
  });

  it("uses dedicated Baby icon ids (not Money bills/import/spending)", () => {
    const items = visibleAppSectionItems("baby", () => true);
    const icons = Object.fromEntries(items.map((i) => [i.href, i.icon]));
    assert.equal(icons["/baby"], "babyHome");
    assert.equal(icons["/baby/insights"], "babyInsights");
    assert.equal(icons["/baby/activities"], "babyActivities");
    assert.equal(icons["/baby/feed"], "babyFeed");
    assert.equal(icons["/baby/pump"], "babyPump");
    assert.equal(icons["/baby/sleep"], "babySleep");
    assert.equal(icons["/baby/diaper"], "babyDiaper");
    assert.equal(icons["/baby/growth"], "babyMeasure");
    assert.equal(icons["/baby/settings"], "babySettings");
    assert.equal(icons["/baby/vaccines"], undefined);
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

  it("labels cover every AppNavGroup", () => {
    for (const group of APP_NAV_GROUP_ORDER) {
      assert.equal(typeof APP_NAV_GROUP_LABELS[group], "string");
      assert.ok(APP_NAV_GROUP_LABELS[group].length > 0);
    }
    const labelKeys = Object.keys(APP_NAV_GROUP_LABELS) as AppNavGroup[];
    assert.deepEqual(labelKeys.slice().sort(), [...APP_NAV_GROUP_ORDER].sort());
  });

  it("groups baby items in APP_NAV_GROUP_ORDER without empty groups", () => {
    const items = visibleAppSectionItems("baby", () => true);
    const groups = appSectionItemsByGroup(items);
    assert.deepEqual(
      groups.map(({ group }) => group),
      ["browse", "review", "capture", "configure"],
    );
    assert.deepEqual(
      groups.map(({ group, items: rows }) => [group, rows.map((r) => r.href)]),
      [
        ["browse", ["/baby"]],
        ["review", ["/baby/insights", "/baby/activities"]],
        [
          "capture",
          [
            "/baby/feed",
            "/baby/pump",
            "/baby/sleep",
            "/baby/diaper",
            "/baby/growth",
          ],
        ],
        ["configure", ["/baby/settings"]],
      ],
    );
  });

  it("groups money with optional tabs hidden and omits empty groups", () => {
    const items = visibleAppSectionItems("money", (key) => key == null);
    const groups = appSectionItemsByGroup(items);
    assert.deepEqual(
      groups.map(({ group }) => group),
      ["browse", "review", "capture", "configure"],
    );
    assert.deepEqual(
      groups.map(({ group, items: rows }) => [group, rows.map((r) => r.label)]),
      [
        ["browse", ["Spending"]],
        ["review", ["Insights"]],
        ["capture", ["Add transaction"]],
        ["configure", ["Settings"]],
      ],
    );
  });

  it("omits empty groups when a group has no items", () => {
    const onlyBrowse = APP_SECTION_NAV.loans.items.filter(
      (item) => item.group === "browse",
    );
    const groups = appSectionItemsByGroup(onlyBrowse);
    assert.deepEqual(
      groups.map(({ group }) => group),
      ["browse"],
    );
  });
});
