import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatCompactMinor,
  formatCompactPercent,
  fxRateInputAddons,
  getCurrencySymbol,
} from "@/lib/format-money";

describe("fxRateInputAddons", () => {
  it("formats USD → VND as $1 = …₫", () => {
    assert.deepEqual(fxRateInputAddons("USD", "VND"), {
      leading: "$1 =",
      trailing: "\u20AB",
    });
  });

  it("uses currency symbols for other pairs", () => {
    const from = getCurrencySymbol("EUR");
    const to = getCurrencySymbol("USD");
    assert.deepEqual(fxRateInputAddons("EUR", "USD"), {
      leading: `${from}1 =`,
      trailing: to,
    });
  });
});

describe("formatCompactMinor", () => {
  it("formats large USD numbers with k, M, B, T", () => {
    assert.equal(formatCompactMinor(1_500_00, "USD"), "$1.5k");
    assert.equal(formatCompactMinor(150_000_00, "USD"), "$150k");
    assert.equal(formatCompactMinor(1_250_000_00, "USD"), "$1.25M");
    assert.equal(formatCompactMinor(150_000_000_00, "USD"), "$150M");
    assert.equal(formatCompactMinor(2_000_000_000_00, "USD"), "$2B");
    assert.equal(formatCompactMinor(-15_000_00, "USD"), "-$15k");
    assert.equal(formatCompactMinor(-1_500_000_00, "USD"), "-$1.5M");
  });

  it("formats large VND numbers with k, M, B, T", () => {
    assert.equal(formatCompactMinor(500_000, "VND"), "500k ₫");
    assert.equal(formatCompactMinor(150_000_000, "VND"), "150M ₫");
    assert.equal(formatCompactMinor(1_500_000_000, "VND"), "1,5B ₫");
    assert.equal(formatCompactMinor(-50_000_000, "VND"), "-50M ₫");
  });

  it("preserves standard formatting under 1000", () => {
    assert.equal(formatCompactMinor(500_00, "USD"), "$500.00");
    assert.equal(formatCompactMinor(500, "VND"), "500₫");
  });
});

describe("formatCompactPercent", () => {
  it("formats large percentage numbers with k, M, B, T", () => {
    assert.equal(formatCompactPercent(1500), "1.5k%");
    assert.equal(formatCompactPercent(15_000), "15k%");
    assert.equal(formatCompactPercent(150_000), "150k%");
    assert.equal(formatCompactPercent(1_250_000), "1.25M%");
    assert.equal(formatCompactPercent(150_000_000), "150M%");
    assert.equal(formatCompactPercent(2_000_000_000), "2B%");
    assert.equal(formatCompactPercent(-15_000), "-15k%");
    assert.equal(formatCompactPercent(-1_500_000), "-1.5M%");
  });

  it("preserves 1 decimal place under 1000", () => {
    assert.equal(formatCompactPercent(50), "50.0%");
    assert.equal(formatCompactPercent(12.34), "12.3%");
    assert.equal(formatCompactPercent(-5.5), "-5.5%");
    assert.equal(formatCompactPercent(0), "0.0%");
  });
});
