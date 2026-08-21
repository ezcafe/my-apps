import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  moneyQuickPickChipCls,
  moneyQuickPickChipHeightCls,
  moneyQuickPickGroupCls,
  moneyQuickPickOtherChipCls,
} from "@/lib/money-quick-pick-chip-cls";

describe("moneyQuickPickChipCls", () => {
  it("matches Amount field height and uses an accent border when selected", () => {
    const active = moneyQuickPickChipCls(true);
    const idle = moneyQuickPickChipCls(false);
    assert.ok(active.includes(moneyQuickPickChipHeightCls));
    assert.match(active, /border-accent/);
    assert.match(idle, /border-transparent/);
    assert.doesNotMatch(idle, /border-accent/);
  });

  it("exports a shared radiogroup shell", () => {
    assert.match(moneyQuickPickGroupCls, /rounded-\[var\(--radius-md\)\]/);
    assert.match(moneyQuickPickGroupCls, /border-border/);
  });

  it("uses the same selected treatment on the Other chip", () => {
    const active = moneyQuickPickOtherChipCls(true);
    assert.match(active, /border-accent/);
    assert.ok(active.includes(moneyQuickPickChipHeightCls));
  });
});
