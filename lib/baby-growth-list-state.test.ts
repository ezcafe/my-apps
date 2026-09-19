import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { babyGrowthListState } from "@/lib/baby-growth-list-state";

describe("babyGrowthListState", () => {
  it("stays loading while the query is unsettled even with zero entries", () => {
    assert.equal(
      babyGrowthListState({ isLoading: true, isError: false, entryCount: 0 }),
      "loading",
    );
  });

  it("shows empty only after settled with no entries and no error", () => {
    assert.equal(
      babyGrowthListState({ isLoading: false, isError: false, entryCount: 0 }),
      "empty",
    );
  });

  it("shows ready when entries exist", () => {
    assert.equal(
      babyGrowthListState({ isLoading: false, isError: false, entryCount: 2 }),
      "ready",
    );
  });

  it("prefers loading over ready while unsettled", () => {
    assert.equal(
      babyGrowthListState({ isLoading: true, isError: false, entryCount: 3 }),
      "loading",
    );
  });

  it("surfaces error instead of empty when the query failed with no pages", () => {
    assert.equal(
      babyGrowthListState({ isLoading: false, isError: true, entryCount: 0 }),
      "error",
    );
  });

  it("keeps error even if stale entries remain", () => {
    assert.equal(
      babyGrowthListState({ isLoading: false, isError: true, entryCount: 2 }),
      "error",
    );
  });

  it("prefers loading over error while unsettled", () => {
    assert.equal(
      babyGrowthListState({ isLoading: true, isError: true, entryCount: 0 }),
      "loading",
    );
  });
});
