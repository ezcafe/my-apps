import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_INSIGHTS_LIST_VISIBLE_CAP,
  babyInsightsNextListVisibleCount,
  babyInsightsVisibleListRows,
} from "@/lib/baby-insights-list-visible";

describe("babyInsightsVisibleListRows", () => {
  it("returns all rows when under the cap", () => {
    const rows = [1, 2, 3];
    assert.deepEqual(babyInsightsVisibleListRows(rows, 100), {
      visible: [1, 2, 3],
      hasMore: false,
      hiddenCount: 0,
    });
  });

  it("caps visible rows and reports remaining", () => {
    const rows = Array.from({ length: 150 }, (_, i) => i);
    const next = babyInsightsVisibleListRows(rows, 100);
    assert.equal(next.visible.length, 100);
    assert.equal(next.visible[0], 0);
    assert.equal(next.visible[99], 99);
    assert.equal(next.hasMore, true);
    assert.equal(next.hiddenCount, 50);
  });

  it("default cap matches BABY_INSIGHTS_LIST_VISIBLE_CAP", () => {
    const rows = Array.from(
      { length: BABY_INSIGHTS_LIST_VISIBLE_CAP + 1 },
      (_, i) => i,
    );
    const next = babyInsightsVisibleListRows(rows);
    assert.equal(next.visible.length, BABY_INSIGHTS_LIST_VISIBLE_CAP);
    assert.equal(next.hasMore, true);
  });
});

describe("babyInsightsNextListVisibleCount", () => {
  it("grows by one cap step", () => {
    assert.equal(
      babyInsightsNextListVisibleCount(BABY_INSIGHTS_LIST_VISIBLE_CAP),
      BABY_INSIGHTS_LIST_VISIBLE_CAP * 2,
    );
  });
});
