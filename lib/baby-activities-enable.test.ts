import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  babyActivitiesListsEnabled,
  babyInsightsGrowthEnabled,
  babyInsightsTimelineListEnabled,
} from "@/lib/baby-activities-enable";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("babyActivitiesListsEnabled", () => {
  it("returns true on mount (no expand / activityOpen gate)", () => {
    assert.equal(babyActivitiesListsEnabled(), true);
  });

  it("Activities wires listsEnabled into timeline + growth queries and owns sync", () => {
    const src = readSrc("components/baby-activities-page.tsx");
    assert.match(src, /babyActivitiesListsEnabled\(\)/);
    assert.match(src, /enabled:\s*listsEnabled/);
    assert.match(src, /syncTimelineFirstPage/);
    assert.match(src, /applyBabyTimelineSyncTruncate/);
    assert.match(src, /window\.setInterval/);
    assert.match(src, /babyInsightsShouldAutoFetchNextPage/);
    assert.doesNotMatch(src, /activityOpen/);
  });
});

describe("babyInsightsGrowthEnabled", () => {
  it("follows moreOpen only — false when collapsed", () => {
    assert.equal(babyInsightsGrowthEnabled({ moreOpen: false }), false);
  });

  it("follows moreOpen only — true when More insights open", () => {
    assert.equal(babyInsightsGrowthEnabled({ moreOpen: true }), true);
  });

  it("Insights wires growth enable from moreOpen only (no activityOpen)", () => {
    const helper = readSrc("lib/baby-activities-enable.ts");
    const sig = helper.match(
      /export function babyInsightsGrowthEnabled\(([^)]*)\)/,
    );
    assert.ok(sig, "growth enable helper exported");
    assert.match(sig[1]!, /moreOpen:\s*boolean/);
    assert.doesNotMatch(sig[1]!, /activityOpen/);

    const insights = readSrc("components/baby-insights-dashboard.tsx");
    assert.match(
      insights,
      /babyInsightsGrowthEnabled\(\{\s*moreOpen\s*\}/,
    );
    assert.match(insights, /enabled:\s*growthEnabled/);
    assert.doesNotMatch(insights, /activityOpen/);
  });
});

describe("babyInsightsTimelineListEnabled", () => {
  it("stays off Insights after Activities move", () => {
    assert.equal(babyInsightsTimelineListEnabled(), false);
  });

  it("Insights has no timeline list, sync truncate, or timeline auto-page", () => {
    const src = readSrc("components/baby-insights-dashboard.tsx");
    assert.doesNotMatch(src, /syncTimelineFirstPage/);
    assert.doesNotMatch(src, /applyBabyTimelineSyncTruncate/);
    assert.doesNotMatch(src, /timelineQueryKey/);
    assert.doesNotMatch(src, /BABY_TIMELINE_MAX_PAGES/);
    assert.doesNotMatch(src, /allowTimelineAutoFetch/);
    assert.doesNotMatch(src, /window\.setInterval/);
    // No mock-theater void of the enable helper — timeline stays absent.
    assert.doesNotMatch(src, /void\s+babyInsightsTimelineListEnabled/);
    assert.doesNotMatch(src, /babyInsightsTimelineListEnabled/);
  });

  it("Insights auto-pages / load-mores growth when moreOpen (charts not stuck on page 1)", () => {
    const src = readSrc("components/baby-insights-dashboard.tsx");
    assert.match(src, /growthQuery\.fetchNextPage/);
    assert.match(src, /BABY_GROWTH_MAX_PAGES/);
    assert.match(
      src,
      /babyInsightsShouldAutoFetchNextPage\([^,]+,\s*BABY_GROWTH_MAX_PAGES/,
    );
    // Growth paging stays gated by moreOpen / growthEnabled — not always-on.
    assert.match(src, /growthEnabled/);
    assert.doesNotMatch(src, /activityOpen/);
  });
});
