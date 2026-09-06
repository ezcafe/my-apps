import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { babyInsightsSectionState } from "@/lib/baby-insights-section-state";

describe("babyInsightsSectionState", () => {
  it("surfaces error instead of empty when the query failed", () => {
    assert.equal(
      babyInsightsSectionState({ isError: true, itemCount: 0 }),
      "error",
    );
  });

  it("shows empty when settled with no items and no error", () => {
    assert.equal(
      babyInsightsSectionState({ isError: false, itemCount: 0 }),
      "empty",
    );
  });

  it("shows ready when items exist", () => {
    assert.equal(
      babyInsightsSectionState({ isError: false, itemCount: 4 }),
      "ready",
    );
  });

  it("keeps error even if stale items remain", () => {
    assert.equal(
      babyInsightsSectionState({ isError: true, itemCount: 2 }),
      "error",
    );
  });
});
