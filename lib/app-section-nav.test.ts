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
  });

  it("returns null on core shell routes", () => {
    assert.equal(resolveAppSectionFromPath("/help"), null);
    assert.equal(resolveAppSectionFromPath("/settings"), null);
  });
});

describe("visibleAppSectionItems", () => {
  it("hides optional Money ledgers when disabled", () => {
    const items = visibleAppSectionItems("money", (key) => key == null);
    assert.deepEqual(
      items.map((item) => item.label),
      [
        "Insights",
        "Add transaction",
        "Spending",
        "Money settings",
      ],
    );
  });
});

describe("appSectionItemsByGroup", () => {
  it("preserves review before capture", () => {
    const groups = appSectionItemsByGroup(APP_SECTION_NAV.loans.items);
    assert.deepEqual(
      groups.map(({ group }) => group),
      ["review", "capture", "browse", "configure"],
    );
  });
});
