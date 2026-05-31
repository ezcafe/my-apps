import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  budgetUtilizationAnalyticsFill,
  budgetUtilizationChipFill,
  budgetUtilizationFillColor,
  budgetUtilizationPctTextClassName,
  budgetUtilizationTone,
  clampBudgetUtilizationWidthPct,
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

describe("clampBudgetUtilizationWidthPct", () => {
  it("clamps fill width to 0–100", () => {
    assert.equal(clampBudgetUtilizationWidthPct(-1), 0);
    assert.equal(clampBudgetUtilizationWidthPct(50), 50);
    assert.equal(clampBudgetUtilizationWidthPct(100), 100);
    assert.equal(clampBudgetUtilizationWidthPct(150), 100);
  });
});

describe("budgetUtilizationChipFill", () => {
  it("returns null without budget data", () => {
    assert.equal(budgetUtilizationChipFill(undefined), null);
    assert.equal(budgetUtilizationChipFill(Number.NaN), null);
  });

  it("maps 50% utilization to warn tone and half-width fill", () => {
    const fill = budgetUtilizationChipFill(50);
    assert.ok(fill);
    assert.equal(fill.widthPct, 50);
    assert.equal(fill.fillColor, budgetUtilizationFillColor("warn"));
    assert.match(fill.fillColor, /--chart-2/);
  });

  it("caps bar width at 100% while keeping raw progressPct", () => {
    const fill = budgetUtilizationChipFill(120);
    assert.ok(fill);
    assert.equal(fill.widthPct, 100);
    assert.equal(fill.progressPct, 120);
    assert.equal(budgetUtilizationTone(fill.progressPct), "danger");
  });
});

describe("budgetUtilizationAnalyticsFill", () => {
  it("uses accent fill under budget and destructive when over", () => {
    const ok = budgetUtilizationAnalyticsFill(50);
    assert.ok(ok);
    assert.equal(ok.fillColor, "var(--accent)");

    const over = budgetUtilizationAnalyticsFill(120);
    assert.ok(over);
    assert.equal(over.fillColor, "var(--destructive)");
  });

  it("maps pct label class to muted or destructive", () => {
    assert.match(budgetUtilizationPctTextClassName(50), /text-muted/);
    assert.match(budgetUtilizationPctTextClassName(120), /text-destructive/);
  });
});
