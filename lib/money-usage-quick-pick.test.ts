import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOtherSelection,
  otherChipLabel,
  quickPickIds,
  shouldShowOtherChip,
  topUsageItems,
  type UsageRankedItem,
} from "@/lib/money-usage-quick-pick";

const items: UsageRankedItem[] = [
  { id: "a", label: "Alpha", usageCount: 3 },
  { id: "b", label: "Bravo", usageCount: 2 },
  { id: "c", label: "Charlie", usageCount: 1 },
];

const pinned: UsageRankedItem[] = [
  { id: "__new__", label: "Create new symbol" },
];

describe("shouldShowOtherChip", () => {
  it("hides Other when there are at most 5 items and nothing is pinned", () => {
    assert.equal(shouldShowOtherChip({ itemCount: 3 }), false);
    assert.equal(shouldShowOtherChip({ itemCount: 5 }), false);
  });

  it("shows Other when the list overflows", () => {
    assert.equal(shouldShowOtherChip({ itemCount: 6 }), true);
  });

  it("shows Other when pinned actions exist even with a short list", () => {
    assert.equal(shouldShowOtherChip({ itemCount: 2, pinnedCount: 1 }), true);
    assert.equal(shouldShowOtherChip({ itemCount: 0, pinnedCount: 1 }), true);
  });

  it("shows Other in compact mode", () => {
    assert.equal(shouldShowOtherChip({ itemCount: 1, compact: true }), true);
  });
});

describe("isOtherSelection with pinned items", () => {
  const quick = topUsageItems(items, 5);
  const quickIds = quickPickIds(quick);
  const pinnedIds = new Set(pinned.map((i) => i.id));

  it("treats a pinned id as Other even when chips fit", () => {
    assert.equal(
      isOtherSelection("__new__", quickIds, items.length, 5, false, pinnedIds),
      true,
    );
  });

  it("does not treat a quick chip as Other when pins only add the overflow chip", () => {
    assert.equal(
      isOtherSelection("a", quickIds, items.length, 5, false, pinnedIds),
      false,
    );
  });
});

describe("otherChipLabel with pinned items", () => {
  const quick = topUsageItems(items, 5);
  const quickIds = quickPickIds(quick);

  it("shows the pinned label when that action is selected", () => {
    assert.equal(
      otherChipLabel(
        "__new__",
        [...items, ...pinned],
        quickIds,
        items.length,
        "Other symbol",
        5,
        false,
        pinned,
      ),
      "Create new symbol",
    );
  });
});
