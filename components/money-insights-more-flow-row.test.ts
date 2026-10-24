import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MoneyAnalyticsChartsSkeleton } from "@/components/money-analytics-skeleton";

const dashSrc = () =>
  readFileSync(join(process.cwd(), "components/analytics-dashboard.tsx"), "utf8");

const layoutSrc = () =>
  readFileSync(join(process.cwd(), "components/analytics-chart-layout.ts"), "utf8");

const skeletonSrc = () =>
  readFileSync(
    join(process.cwd(), "components/money-analytics-skeleton.tsx"),
    "utf8",
  );

/** Slice moreInsights expanded block (sankey + recurring live under this gate). */
function moreInsightsBlock(src: string): string {
  const start = src.indexOf("{moreInsights ? (");
  assert.ok(start >= 0, "moreInsights gate missing");
  const end = src.indexOf(") : null}", start);
  assert.ok(end > start, "moreInsights block end missing");
  return src.slice(start, end);
}

describe("money insights more=1 — flow + recurring row", () => {
  it("layout exports 2/3 + 1/3 more-flow row tokens", () => {
    const src = layoutSrc();
    assert.match(src, /ANALYTICS_MORE_FLOW_ROW_GRID/);
    assert.match(src, /ANALYTICS_MORE_FLOW_PRIMARY_CLASS/);
    assert.match(src, /ANALYTICS_MORE_FLOW_SIDE_CLASS/);
    assert.match(src, /lg:col-span-8/);
    assert.match(src, /lg:col-span-4/);
  });

  it("dashboard puts sankey + recurring on the more-flow row (primary then side)", () => {
    const block = moreInsightsBlock(dashSrc());
    assert.match(block, /ANALYTICS_MORE_FLOW_ROW_GRID/);
    const primaryAt = block.indexOf("ANALYTICS_MORE_FLOW_PRIMARY_CLASS");
    const sideAt = block.indexOf("ANALYTICS_MORE_FLOW_SIDE_CLASS");
    const sankeyAt = block.indexOf("MoneyFlowSankeyCard");
    const recurringAt = block.indexOf("RecurringSpendCard");
    assert.ok(primaryAt >= 0 && sideAt > primaryAt);
    assert.ok(sankeyAt >= 0 && recurringAt > sankeyAt);
    assert.ok(
      sankeyAt < recurringAt,
      "How does money move (sankey) must precede Recurring spend",
    );
  });

  it("expanded charts skeleton mirrors more-flow duo after the 3×2 grid", () => {
    const src = skeletonSrc();
    assert.match(src, /ANALYTICS_MORE_FLOW_ROW_GRID/);
    assert.match(src, /ANALYTICS_MORE_FLOW_PRIMARY_CLASS/);
    assert.match(src, /ANALYTICS_MORE_FLOW_SIDE_CLASS/);

    const html = renderToStaticMarkup(
      createElement(MoneyAnalyticsChartsSkeleton, { expanded: true }),
    );
    assert.match(html, /lg:col-span-8/);
    assert.match(html, /lg:col-span-4/);
  });
});
