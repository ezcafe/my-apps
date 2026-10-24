import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyInsightsPageSkeleton } from "@/components/baby-page-skeleton";

describe("Task 4 — Baby Insights hero + KPIs above charts", () => {
  it("source: count KPIs + insight metrics appear before default charts", () => {
    const src = readFileSync(
      join(process.cwd(), "components/baby-insights-dashboard.tsx"),
      "utf8",
    );
    const countKpis = src.indexOf('data-testid="baby-count-kpis"');
    const insightMetrics = src.indexOf('aria-label="Insight metrics"');
    const defaultCharts = src.indexOf(
      'data-testid="baby-insights-default-charts"',
    );
    assert.ok(countKpis >= 0, "baby-count-kpis present");
    assert.ok(insightMetrics >= 0, "Insight metrics present");
    assert.ok(defaultCharts >= 0, "default charts present");
    assert.ok(
      countKpis < defaultCharts,
      "baby-count-kpis must appear before default charts in source",
    );
    assert.ok(
      insightMetrics < defaultCharts,
      "Insight metrics must appear before default charts in source",
    );
  });

  it("source: default charts hero triad — Night rest, Hydration, Care over time below Hydration", () => {
    const src = readFileSync(
      join(process.cwd(), "components/baby-insights-dashboard.tsx"),
      "utf8",
    );
    const testId = src.indexOf('data-testid="baby-insights-default-charts"');
    assert.ok(testId >= 0);
    // Include the opening <section className={…}> just before the test id.
    const chartsStart = Math.max(0, testId - 120);
    const moreBtn = src.indexOf('data-testid="baby-more-insights"', testId);
    const charts = src.slice(
      chartsStart,
      moreBtn > testId ? moreBtn : testId + 2000,
    );

    assert.match(charts, /ANALYTICS_HERO_ROW_GRID/);
    assert.doesNotMatch(
      charts,
      /minmax\(min\(100%, 16rem\), 1fr\)/,
      "ATF must not use equal auto-fit 2-up as sole stand-in",
    );

    const night = charts.indexOf("BabyNightRestChart");
    const hydration = charts.indexOf("BabyHydrationChart");
    const care = charts.indexOf("BabyCareCountChart");
    assert.ok(night >= 0 && hydration > night, "Night rest before Hydration");
    assert.ok(
      care > hydration,
      "Care over time must follow Hydration (below side slot)",
    );

    assert.match(charts, /ANALYTICS_HERO_SPEND_CLASS/);
    assert.match(charts, /ANALYTICS_HERO_SIDE_CLASS/);
    assert.match(charts, /lg:row-start-1/);
    assert.match(charts, /lg:row-start-2/);

    const morePanel = src.indexOf('data-testid="baby-more-insights-panel"');
    assert.ok(morePanel > care);
    assert.equal(
      src.slice(morePanel).includes("BabyCareCountChart"),
      false,
      "Care over time must leave the More panel",
    );
  });

  it("BabyInsightsPageSkeleton: KPI strip before triad charts; no equal 2-up ATF", () => {
    const html = renderToStaticMarkup(createElement(BabyInsightsPageSkeleton));

    const kpi = html.indexOf('data-skeleton="insights-kpi-strip"');
    const hero = html.indexOf('data-skeleton="insights-hero-triad"');
    assert.ok(kpi >= 0, "KPI strip skeleton present");
    assert.ok(hero >= 0, "triad hero skeleton present");
    assert.ok(kpi < hero, "KPI strip before triad charts");

    assert.match(html, /lg:grid-cols-12 lg:grid-rows-\[280px_280px\]/);
    assert.equal(
      (html.match(/lg:col-span-4 lg:col-start-9/g) ?? []).length,
      2,
      "triad skeleton: Hydration + Care over time side slots",
    );
    assert.match(html, /lg:row-start-1/);
    assert.match(html, /lg:row-start-2/);
    assert.doesNotMatch(
      html,
      /minmax\(min\(100%, 16rem\), 1fr\)/,
      "no equal auto-fit 2-up as ATF stand-in",
    );

    const src = readFileSync(
      join(process.cwd(), "components/baby-page-skeleton.tsx"),
      "utf8",
    );
    assert.match(
      src,
      /BabyInsightsPageSkeleton[\s\S]*?triggerCount=\{3\}/,
    );
  });

  it("More panel still holds pattern/growth charts (ATF is night + hydration + care)", () => {
    const src = readFileSync(
      join(process.cwd(), "components/baby-insights-dashboard.tsx"),
      "utf8",
    );
    const morePanel = src.indexOf('data-testid="baby-more-insights-panel"');
    const pattern = src.indexOf("BabyPatternFinderChart", morePanel);
    const defaultCharts = src.indexOf(
      'data-testid="baby-insights-default-charts"',
    );
    const nightInAtf = src.indexOf("BabyNightRestChart", defaultCharts);
    const careInAtf = src.indexOf("BabyCareCountChart", defaultCharts);
    const patternInAtfZone = src
      .slice(defaultCharts, morePanel)
      .includes("BabyPatternFinderChart");

    assert.ok(morePanel >= 0 && pattern > morePanel);
    assert.ok(nightInAtf >= 0 && nightInAtf < morePanel);
    assert.ok(careInAtf >= 0 && careInAtf < morePanel);
    assert.equal(patternInAtfZone, false);
  });
});
