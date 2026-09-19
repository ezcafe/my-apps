import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
  InsightsDateRangeFiltersBar,
  type InsightsMultiSelectFilter,
} from "@/components/analytics-filters";
import {
  BabyActivitiesPageSkeleton,
  BabyGrowthPageSkeleton,
  BabyInsightsPageSkeleton,
} from "@/components/baby-page-skeleton";
import { PreferencesProvider } from "@/components/preferences-provider";
import { t } from "@/lib/baby-i18n";

describe("BabyGrowthPageSkeleton", () => {
  it("uses locked order kinds → form (no recent list)", () => {
    const html = renderToStaticMarkup(createElement(BabyGrowthPageSkeleton));
    const kinds = html.indexOf('data-skeleton="growth-kind-chips"');
    const form = html.indexOf('data-skeleton="growth-form"');
    const recent = html.indexOf('data-skeleton="growth-recent"');
    assert.ok(kinds >= 0 && form > kinds);
    assert.equal(recent, -1);
  });

  it("renders static 8 chips + vaccine-sized field/Save block (no kind param)", () => {
    const html = renderToStaticMarkup(createElement(BabyGrowthPageSkeleton));
    const chipsChunk = html.slice(
      html.indexOf('data-skeleton="growth-kind-chips"'),
      html.indexOf('data-skeleton="growth-form"'),
    );
    assert.equal(
      (chipsChunk.match(/h-\[calc\(1\.5rem\+1\.5em\+2px\)\] w-20/g) ?? []).length,
      8,
    );
    assert.doesNotMatch(html, /kind=/);
    assert.doesNotMatch(html, /searchParams/);
    const formChunk = html.slice(html.indexOf('data-skeleton="growth-form"'));
    assert.ok(
      (formChunk.match(/rounded-\[var\(--radius-md\)\]/g) ?? []).length >= 3,
    );
  });
});

function countFilterTriggerPlaceholders(html: string): number {
  // MoneyAnalyticsFiltersBarSkeleton uses h-11 w-20 for each filter trigger.
  return (html.match(/h-11 w-20 shrink-0/g) ?? []).length;
}

describe("BabyInsightsPageSkeleton date-only", () => {
  it("renders one filter trigger placeholder (no care/growth chips)", () => {
    const insights = renderToStaticMarkup(
      createElement(BabyInsightsPageSkeleton),
    );
    const activities = renderToStaticMarkup(
      createElement(BabyActivitiesPageSkeleton),
    );
    assert.equal(countFilterTriggerPlaceholders(insights), 1);
    assert.equal(countFilterTriggerPlaceholders(activities), 2);
  });
});

describe("Insights empty copy is date-only", () => {
  it("mentions date range and not care/growth filter advice", () => {
    const en = t("insights.emptyTimeline", "en");
    assert.match(en, /date range/i);
    assert.doesNotMatch(en, /care type|growth kind|these filters/i);
    assert.doesNotMatch(t("insights.emptyGrowth", "en"), /in the filters/i);
    assert.doesNotMatch(
      t("insights.emptyTimeline", "vi"),
      /khớp bộ lọc|trong bộ lọc/i,
    );
  });
});

describe("Growth path copy", () => {
  it("uses Log growth for page title", () => {
    assert.equal(t("growth.title", "en"), "Log growth");
    assert.doesNotMatch(t("growth.title", "en"), /measure/i);
  });
});

describe("InsightsDateRangeFiltersBar date-only chrome", () => {
  const value = { fromDate: "2026-01-01", toDate: "2026-01-31" };

  function renderBar(multiSelectFilters: InsightsMultiSelectFilter[] = []) {
    return renderToStaticMarkup(
      createElement(
        PreferencesProvider,
        { initialDateFormat: "ymd" },
        createElement(InsightsDateRangeFiltersBar, {
          value,
          onChange: () => {},
          onApply: () => {},
          onReset: () => {},
          applying: false,
          dirty: false,
          multiSelectFilters,
        }),
      ),
    );
  }

  it("omits Care types when multiSelectFilters is empty (Insights wiring)", () => {
    const dateOnly = renderBar([]);
    assert.match(dateOnly, /aria-label="Insights filters"/);
    assert.doesNotMatch(dateOnly, /Care types/i);
    assert.doesNotMatch(dateOnly, /Growth kinds/i);

    const withCare: InsightsMultiSelectFilter[] = [
      {
        id: "care",
        label: "Care types",
        legend: "Care",
        ariaLabel: "Care types",
        items: [{ id: "feed", label: "Feed" }],
        value: [],
        onChange: () => {},
      },
    ];
    const withChips = renderBar(withCare);
    assert.match(withChips, /Care types/);
  });
});
