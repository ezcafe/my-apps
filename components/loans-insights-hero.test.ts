import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Task 3 — Loans Insights adapted duo + urgency", () => {
  it("ATF uses hero grid with Remaining before Paid P/I and spend + side classes", () => {
    const src = readFileSync(
      join(process.cwd(), "components/loans-insights-dashboard.tsx"),
      "utf8",
    );
    const atfStart = src.indexOf('aria-label="Insights dashboard"');
    assert.ok(atfStart >= 0);
    const moreStart = src.indexOf("Combined payoff progress", atfStart);
    const atf = src.slice(
      atfStart,
      moreStart > atfStart ? moreStart : atfStart + 2500,
    );

    assert.match(atf, /ANALYTICS_HERO_ROW_GRID/);
    assert.doesNotMatch(atf, /md:grid-cols-2/);

    const remaining = atf.indexOf("LoansRemainingByLoanCard");
    const paid = atf.indexOf("LoansPaidPrincipalInterestCard");
    assert.ok(remaining >= 0 && paid > remaining);

    assert.match(atf, /ANALYTICS_HERO_SPEND_CLASS/);
    assert.match(atf, /ANALYTICS_HERO_SIDE_CLASS/);
    assert.match(src, /MoneyAnalyticsChartsSkeleton\s+heroVariant=["']duo["']/);
  });

  it("route loading and page Suspense pass showUrgencyStrip", () => {
    const loading = readFileSync(
      join(process.cwd(), "app/(shell)/loans/insights/loading.tsx"),
      "utf8",
    );
    assert.match(loading, /FeatureInsightsPageSkeleton\s+showUrgencyStrip/);

    const page = readFileSync(
      join(process.cwd(), "app/(shell)/loans/insights/page.tsx"),
      "utf8",
    );
    assert.match(page, /FeatureInsightsPageSkeleton\s+showUrgencyStrip/);
  });
});
