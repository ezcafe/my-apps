import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dashSrc = () =>
  readFileSync(
    join(process.cwd(), "components/investment-insights-dashboard.tsx"),
    "utf8",
  );

describe("Task 2 — Investments Insights adapted duo", () => {
  it("ATF uses hero grid with Results before Allocation and spend + side classes", () => {
    const src = dashSrc();
    const atfStart = src.indexOf('aria-label="Insights dashboard"');
    assert.ok(atfStart >= 0, "insights dashboard section present");
    const moreTeasers = src.indexOf("data-insights-more-teasers", atfStart);
    const atf = src.slice(
      atfStart,
      moreTeasers > atfStart ? moreTeasers : atfStart + 2500,
    );

    assert.match(atf, /ANALYTICS_HERO_ROW_GRID/);
    assert.doesNotMatch(
      atf,
      /md:grid-cols-2/,
      "ATF must not use equal 2-up grid",
    );

    const results = atf.indexOf("InvestmentResultsOverTimeCard");
    const allocation = atf.indexOf("InvestmentAllocationCard");
    assert.ok(results >= 0 && allocation > results, "Results before Allocation");

    assert.match(atf, /ANALYTICS_HERO_SPEND_CLASS/);
    assert.match(atf, /ANALYTICS_HERO_SIDE_CLASS/);
    assert.match(atf, /CHART_CARD_HEIGHT_TALL/);
    assert.match(atf, /CHART_CARD_HEIGHT_FILL/);
  });

  it("loading / Suspense / in-dashboard charts skeletons use duo variant", () => {
    const dash = dashSrc();
    assert.match(
      dash,
      /FeatureInsightsPageSkeleton[^;\n]*heroVariant=["']duo["']|FeatureInsightsPageSkeleton\s*\/>|MoneyAnalyticsChartsSkeleton\s+heroVariant=["']duo["']/,
    );
    assert.match(dash, /MoneyAnalyticsChartsSkeleton\s+heroVariant=["']duo["']/);

    const loading = readFileSync(
      join(process.cwd(), "app/(shell)/investments/insights/loading.tsx"),
      "utf8",
    );
    assert.match(
      loading,
      /FeatureInsightsPageSkeleton(?:\s+heroVariant=["']duo["'])?/,
    );
    // Default FeatureInsightsPageSkeleton is duo; explicit or default both OK if skeleton defaults duo.
    const page = readFileSync(
      join(process.cwd(), "app/(shell)/investments/insights/page.tsx"),
      "utf8",
    );
    assert.match(page, /FeatureInsightsPageSkeleton/);

    const skeleton = readFileSync(
      join(process.cwd(), "components/money-analytics-skeleton.tsx"),
      "utf8",
    );
    const featureFn = skeleton.indexOf("export function FeatureInsightsPageSkeleton");
    const featureChunk = skeleton.slice(featureFn, featureFn + 1200);
    assert.match(
      featureChunk,
      /heroVariant\s*=\s*["']duo["']|MoneyAnalyticsChartsSkeleton\s+heroVariant=["']duo["']/,
      "FeatureInsightsPageSkeleton must paint duo charts",
    );
  });
});
