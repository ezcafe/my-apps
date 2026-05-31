import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  budgetUtilizationTextClass,
  budgetUtilizationTone,
} from "@/lib/budget-utilization-chart-colors";

describe("budgetUtilizationTone", () => {
  it("returns null for missing or non-finite input", () => {
    assert.equal(budgetUtilizationTone(undefined), null);
    assert.equal(budgetUtilizationTone(null), null);
    assert.equal(budgetUtilizationTone(Number.NaN), null);
  });

  it("uses chart palette thresholds", () => {
    assert.equal(budgetUtilizationTone(49.99), "ok");
    assert.equal(budgetUtilizationTone(0), "ok");
    assert.equal(budgetUtilizationTone(50), "warn");
    assert.equal(budgetUtilizationTone(79.99), "warn");
    assert.equal(budgetUtilizationTone(80), "danger");
    assert.equal(budgetUtilizationTone(150), "danger");
  });
});

describe("budgetUtilizationTextClass", () => {
  it("maps tones to --chart-* text classes", () => {
    assert.match(budgetUtilizationTextClass("ok")!, /--chart-3/);
    assert.match(budgetUtilizationTextClass("warn")!, /--chart-2/);
    assert.match(budgetUtilizationTextClass("danger")!, /--chart-5/);
    assert.match(budgetUtilizationTextClass("ok")!, /^text-/);
  });

  it("returns undefined when tone is absent", () => {
    assert.equal(budgetUtilizationTextClass(null), undefined);
    assert.equal(budgetUtilizationTextClass(undefined), undefined);
  });
});
