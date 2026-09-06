import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  moneyQuickPickChipCls,
  moneyQuickPickChipHeightCls,
  moneyQuickPickGroupCls,
  moneyQuickPickOtherChipCls,
  quickPickChipCls,
  quickPickChipHeightCls,
  quickPickGroupCls,
  quickPickOtherChipCls,
} from "@/lib/money-quick-pick-chip-cls";

describe("quickPickChipCls", () => {
  it("matches Amount field height and uses an accent border when selected", () => {
    const active = quickPickChipCls(true);
    const idle = quickPickChipCls(false);
    assert.ok(active.includes(quickPickChipHeightCls));
    assert.match(active, /border-accent/);
    assert.match(idle, /border-transparent/);
    assert.doesNotMatch(idle, /border-accent/);
  });

  it("exports a shared radiogroup shell", () => {
    assert.match(quickPickGroupCls, /rounded-\[var\(--radius-md\)\]/);
    assert.match(quickPickGroupCls, /border-border/);
  });

  it("uses the same selected treatment on the Other chip", () => {
    const active = quickPickOtherChipCls(true);
    assert.match(active, /border-accent/);
    assert.ok(active.includes(quickPickChipHeightCls));
  });

  it("keeps Money-era aliases pointing at the shared helpers", () => {
    assert.equal(moneyQuickPickChipHeightCls, quickPickChipHeightCls);
    assert.equal(moneyQuickPickGroupCls, quickPickGroupCls);
    assert.equal(moneyQuickPickChipCls(true), quickPickChipCls(true));
    assert.equal(moneyQuickPickOtherChipCls(false), quickPickOtherChipCls(false));
  });
});
