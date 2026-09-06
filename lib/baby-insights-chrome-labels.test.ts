import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyInsightsDateRangeFilterLabels,
  babyInsightsPeriodChipLabels,
} from "@/lib/baby-insights-chrome-labels";
import { t } from "@/lib/baby-i18n";

describe("babyInsightsPeriodChipLabels", () => {
  it("maps baby insights keys for EN period chrome", () => {
    const labels = babyInsightsPeriodChipLabels((key) => t(key, "en"));
    assert.equal(labels.showing, "Showing");
    assert.equal(labels.applyToUpdate, "Apply to update");
  });

  it("maps baby insights keys for VI period chrome (no English leftovers)", () => {
    const labels = babyInsightsPeriodChipLabels((key) => t(key, "vi"));
    assert.equal(labels.showing, "Đang xem");
    assert.equal(labels.applyToUpdate, "Áp dụng để cập nhật");
    assert.notEqual(labels.showing, "Showing");
    assert.notEqual(labels.applyToUpdate, "Apply to update");
  });
});

describe("babyInsightsDateRangeFilterLabels", () => {
  it("maps apply / reset / applying for EN filter chrome", () => {
    const labels = babyInsightsDateRangeFilterLabels((key) => t(key, "en"));
    assert.equal(labels.apply, "Apply");
    assert.equal(labels.applyFilters, "Apply filters");
    assert.equal(labels.reset, "Reset");
    assert.equal(labels.applying, "Loading…");
  });

  it("maps apply / reset / applying for VI filter chrome", () => {
    const labels = babyInsightsDateRangeFilterLabels((key) => t(key, "vi"));
    assert.equal(labels.apply, "Áp dụng");
    assert.equal(labels.applyFilters, "Áp dụng bộ lọc");
    assert.equal(labels.reset, "Đặt lại");
    assert.equal(labels.applying, "Đang tải…");
    assert.notEqual(labels.apply, "Apply");
    assert.notEqual(labels.reset, "Reset");
  });
});
