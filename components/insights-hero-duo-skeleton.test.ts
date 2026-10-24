import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FeatureInsightsPageSkeleton,
  MoneyAnalyticsChartsSkeleton,
  MoneyAnalyticsPageSkeleton,
} from "@/components/money-analytics-skeleton";

const skeletonSrc = () =>
  readFileSync(
    join(process.cwd(), "components/money-analytics-skeleton.tsx"),
    "utf8",
  );

describe("Task 1 — duo hero skeleton helper", () => {
  it("duo charts skeleton uses hero grid + spend + exactly one side card", () => {
    const html = renderToStaticMarkup(
      createElement(MoneyAnalyticsChartsSkeleton, { heroVariant: "duo" }),
    );
    assert.match(html, /lg:grid-cols-12 lg:grid-rows-\[280px_280px\]/);
    assert.match(html, /lg:col-span-8 lg:row-span-2/);
    assert.equal(
      (html.match(/lg:col-span-4 lg:col-start-9/g) ?? []).length,
      1,
      "duo must paint exactly one side slot",
    );
    assert.doesNotMatch(html, /lg:row-start-2/);
  });

  it("default / money collapsed charts skeleton stays full triad (two side slots)", () => {
    const html = renderToStaticMarkup(
      createElement(MoneyAnalyticsChartsSkeleton),
    );
    assert.equal(
      (html.match(/lg:col-span-4 lg:col-start-9/g) ?? []).length,
      2,
      "triad default keeps two side slots",
    );
    assert.match(html, /lg:row-start-1/);
    assert.match(html, /lg:row-start-2/);

    const pageHtml = renderToStaticMarkup(
      createElement(MoneyAnalyticsPageSkeleton),
    );
    assert.equal(
      (pageHtml.match(/lg:col-span-4 lg:col-start-9/g) ?? []).length,
      2,
    );
  });

  it("source wires heroVariant duo through AnalyticsCollapsedGridContent", () => {
    const src = skeletonSrc();
    assert.match(src, /heroVariant/);
    assert.match(src, /["']duo["']/);
    assert.match(src, /ANALYTICS_HERO_ROW_GRID/);
    assert.match(src, /ANALYTICS_HERO_SPEND_CLASS/);
    assert.match(src, /ANALYTICS_HERO_SIDE_CLASS/);
  });
});

describe("Task 5 — duo skeleton spot-check", () => {
  it("FeatureInsightsPageSkeleton default paints duo (no third side slot)", () => {
    const html = renderToStaticMarkup(
      createElement(FeatureInsightsPageSkeleton),
    );
    assert.equal(
      (html.match(/lg:col-span-4 lg:col-start-9/g) ?? []).length,
      1,
    );
    assert.doesNotMatch(html, /lg:row-start-2/);
  });
});
