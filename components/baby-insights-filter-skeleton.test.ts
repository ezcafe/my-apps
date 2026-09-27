import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Baby Insights filter skeleton parity", () => {
  it("page skeleton triggerCount is date + Care + Growth", () => {
    const src = readFileSync(
      join(process.cwd(), "components/baby-page-skeleton.tsx"),
      "utf8",
    );
    assert.match(
      src,
      /BabyInsightsPageSkeleton[\s\S]*?triggerCount=\{3\}/,
    );
  });

  it("dashboard filter loading skeleton uses triggerCount 3", () => {
    const src = readFileSync(
      join(process.cwd(), "components/baby-insights-dashboard.tsx"),
      "utf8",
    );
    assert.match(src, /MoneyAnalyticsFiltersBarSkeleton triggerCount=\{3\}/);
    assert.match(src, /babyInsightsCareGrowthMultiSelects/);
  });
});
