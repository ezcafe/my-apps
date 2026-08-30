import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultAnalyticsFilters } from "@/lib/analytics-default-filters";
import { resolveActiveFilterLabels } from "@/lib/money-active-filter-summary";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";

describe("resolveActiveFilterLabels", () => {
  const categories: MoneyCategoryRow[] = [
    { id: "cat-living", name: "Living", kind: "expense", parentId: null },
    { id: "cat-rent", name: "Rent", kind: "expense", parentId: "cat-living" },
    { id: "cat-groceries", name: "Groceries", kind: "expense", parentId: "cat-living" },
    { id: "cat-salary", name: "Salary", kind: "income", parentId: null },
  ];

  const accounts = [
    { id: "acc-1", name: "Checking" },
    { id: "acc-2", name: "Savings" },
  ];

  const merchants = [
    { id: "m-1", name: "Whole Foods" },
    { id: "m-2", name: "Trader Joe's" },
  ];

  const tags = [
    { id: "tag-1", name: "vacation" },
    { id: "tag-2", name: "tax" },
  ];

  const recurrenceTemplates = [
    { id: "rec-1", name: "Monthly Rent" },
    { id: "rec-2", name: "Netflix" },
  ];

  it("returns empty array for default/unfiltered state", () => {
    const filters = defaultAnalyticsFilters(new Date("2026-08-15T00:00:00Z"));
    const labels = resolveActiveFilterLabels(filters);
    assert.deepEqual(labels, []);
  });

  it("resolves view scope label if provided", () => {
    const filters = defaultAnalyticsFilters();
    const labels = resolveActiveFilterLabels(filters, { viewScopeLabel: "Activity" });
    assert.deepEqual(labels, ["Activity"]);
  });

  it("resolves direction filter (single and multiple)", () => {
    const filtersExpense = { ...defaultAnalyticsFilters(), kinds: ["expense" as const] };
    assert.deepEqual(resolveActiveFilterLabels(filtersExpense), ["Spending"]);

    const filtersIncome = { ...defaultAnalyticsFilters(), kinds: ["income" as const] };
    assert.deepEqual(resolveActiveFilterLabels(filtersIncome), ["Income"]);

    const filtersTransfer = { ...defaultAnalyticsFilters(), kinds: ["transfer" as const] };
    assert.deepEqual(resolveActiveFilterLabels(filtersTransfer), ["Transfers"]);

    const filtersBoth = {
      ...defaultAnalyticsFilters(),
      kinds: ["expense" as const, "income" as const],
    };
    assert.deepEqual(resolveActiveFilterLabels(filtersBoth), ["Spending & Income"]);
  });

  it("resolves account filters (single and multiple)", () => {
    const filtersSingle = { ...defaultAnalyticsFilters(), accountIds: ["acc-1"] };
    assert.deepEqual(
      resolveActiveFilterLabels(filtersSingle, { accounts }),
      ["Checking"],
    );

    const filtersMultiple = {
      ...defaultAnalyticsFilters(),
      accountIds: ["acc-1", "acc-2"],
    };
    assert.deepEqual(
      resolveActiveFilterLabels(filtersMultiple, { accounts }),
      ["2 accounts"],
    );
  });

  it("resolves category filters (single and multiple)", () => {
    const filtersChild = { ...defaultAnalyticsFilters(), categoryIds: ["cat-rent"] };
    assert.deepEqual(
      resolveActiveFilterLabels(filtersChild, { categories }),
      ["Living: Rent"],
    );

    const filtersRoot = { ...defaultAnalyticsFilters(), categoryIds: ["cat-living"] };
    assert.deepEqual(
      resolveActiveFilterLabels(filtersRoot, { categories }),
      ["Living"],
    );

    const filtersMultiple = {
      ...defaultAnalyticsFilters(),
      categoryIds: ["cat-rent", "cat-groceries"],
    };
    assert.deepEqual(
      resolveActiveFilterLabels(filtersMultiple, { categories }),
      ["2 categories"],
    );
  });

  it("resolves merchant, tag, and recurrence filters", () => {
    const filtersSingleMerchant = { ...defaultAnalyticsFilters(), merchantIds: ["m-1"] };
    assert.deepEqual(
      resolveActiveFilterLabels(filtersSingleMerchant, { merchants }),
      ["Whole Foods"],
    );

    const filtersMultiMerchant = { ...defaultAnalyticsFilters(), merchantIds: ["m-1", "m-2"] };
    assert.deepEqual(
      resolveActiveFilterLabels(filtersMultiMerchant, { merchants }),
      ["2 merchants"],
    );

    const filtersSingleTag = { ...defaultAnalyticsFilters(), tagIds: ["tag-1"] };
    assert.deepEqual(
      resolveActiveFilterLabels(filtersSingleTag, { tags }),
      ["#vacation"],
    );

    const filtersMultiTag = { ...defaultAnalyticsFilters(), tagIds: ["tag-1", "tag-2"] };
    assert.deepEqual(
      resolveActiveFilterLabels(filtersMultiTag, { tags }),
      ["2 tags"],
    );

    const filtersRecurring = {
      ...defaultAnalyticsFilters(),
      recurrence: "recurring" as const,
    };
    assert.deepEqual(resolveActiveFilterLabels(filtersRecurring), ["Recurring"]);

    const filtersSpecificRecurrence = {
      ...defaultAnalyticsFilters(),
      recurrence: "recurring" as const,
      recurrenceSourceIds: ["rec-1"],
    };
    assert.deepEqual(
      resolveActiveFilterLabels(filtersSpecificRecurrence, { recurrenceTemplates }),
      ["Recurring: Monthly Rent"],
    );

    const filtersMultiRecurrence = {
      ...defaultAnalyticsFilters(),
      recurrence: "recurring" as const,
      recurrenceSourceIds: ["rec-1", "rec-2"],
    };
    assert.deepEqual(
      resolveActiveFilterLabels(filtersMultiRecurrence, { recurrenceTemplates }),
      ["Recurring (2)"],
    );

    const filtersOneTime = {
      ...defaultAnalyticsFilters(),
      recurrence: "one-time" as const,
    };
    assert.deepEqual(resolveActiveFilterLabels(filtersOneTime), ["One-time"]);
  });

  it("combines multiple active filters in predictable order", () => {
    const filters = {
      ...defaultAnalyticsFilters(),
      kinds: ["expense" as const],
      accountIds: ["acc-1"],
      categoryIds: ["cat-groceries"],
      merchantIds: ["m-1"],
      tagIds: ["tag-1"],
      recurrence: "recurring" as const,
    };

    const labels = resolveActiveFilterLabels(filters, {
      viewScopeLabel: "Activity",
      accounts,
      categories,
      merchants,
      tags,
    });

    assert.deepEqual(labels, [
      "Activity",
      "Spending",
      "Checking",
      "Living: Groceries",
      "Whole Foods",
      "#vacation",
      "Recurring",
    ]);
  });
});
