import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATEGORY_FILTER_NONE } from "@/lib/analytics-category-filter";
import { analyticsFiltersNeedCategoryExpansion } from "@/lib/money-transaction-analytics-conditions";

describe("analyticsFiltersNeedCategoryExpansion", () => {
  it("skips category load when no category filter is set", () => {
    assert.equal(
      analyticsFiltersNeedCategoryExpansion({
        from: "2026-08-01T00:00:00.000Z",
        to: "2026-08-31T23:59:59.999Z",
      }),
      false,
    );
  });

  it("skips category load when only the uncategorized sentinel is set", () => {
    assert.equal(
      analyticsFiltersNeedCategoryExpansion({
        categoryIds: [CATEGORY_FILTER_NONE],
      }),
      false,
    );
  });

  it("requires expansion when a category uuid is present", () => {
    assert.equal(
      analyticsFiltersNeedCategoryExpansion({
        categoryIds: ["11111111-1111-4111-8111-111111111111"],
      }),
      true,
    );
  });
});
