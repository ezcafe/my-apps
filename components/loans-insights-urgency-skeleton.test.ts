import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Loans Insights skeleton urgency parity", () => {
  it("FeatureInsightsPageSkeleton can reserve urgency strip before KPIs", () => {
    const src = readFileSync(
      join(process.cwd(), "components/money-analytics-skeleton.tsx"),
      "utf8",
    );
    assert.match(src, /showUrgencyStrip/);
    assert.match(src, /loans-insights-urgency-skeleton/);
  });

  it("Loans Insights page skeleton enables urgency strip", () => {
    const src = readFileSync(
      join(process.cwd(), "components/loans-insights-dashboard.tsx"),
      "utf8",
    );
    assert.match(src, /FeatureInsightsPageSkeleton showUrgencyStrip/);
    assert.match(src, /LoansInsightsUrgencyStrip/);
  });
});
