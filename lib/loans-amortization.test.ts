import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAmortizationSchedule,
  buildProgressChartSeries,
  computeFirstMonthInterestMinor,
  computeLoanSummary,
  computeMonthlyPaymentMinor,
  daysBetweenExclusive,
  dueDateForInstallment,
} from "./loans-amortization";

describe("computeMonthlyPaymentMinor", () => {
  it("splits principal evenly at zero rate", () => {
    assert.equal(computeMonthlyPaymentMinor(120_000, 0, 12), 10_000);
  });

  it("computes PMT EMI for 2.3B VND at 6.6% over 300 months", () => {
    const principal = 2_300_000_000;
    const rateBps = 660;
    const term = 300;
    assert.equal(
      computeMonthlyPaymentMinor(principal, rateBps, term),
      15_673_789,
    );
  });
});

describe("computeFirstMonthInterestMinor", () => {
  it("uses actual/365 days over first accrual period", () => {
    const principal = 2_300_000_000;
    const rateBps = 660;
    const startDate = "2025-04-10";
    const dueDay = 25;
    const dueDate = dueDateForInstallment(startDate, dueDay, 1);
    const days = daysBetweenExclusive(startDate, dueDate);
    assert.equal(
      computeFirstMonthInterestMinor(principal, rateBps, startDate, dueDay),
      Math.round((principal * rateBps * days) / (10_000 * 365)),
    );
    assert.equal(
      computeFirstMonthInterestMinor(principal, rateBps, startDate, dueDay),
      6_238_356,
    );
  });
});

describe("daysBetweenExclusive", () => {
  it("counts Apr 10 to Apr 25 as 15 days", () => {
    assert.equal(daysBetweenExclusive("2025-04-10", "2025-04-25"), 15);
  });

  it("counts Jan 15 to Feb 15 as 31 days", () => {
    assert.equal(daysBetweenExclusive("2026-01-15", "2026-02-15"), 31);
  });
});

describe("buildAmortizationSchedule", () => {
  const excelFixture = {
    principalMinor: 2_300_000_000,
    annualRateBps: 660,
    termMonths: 300,
    startDate: "2025-04-10",
    dueDayOfMonth: 25,
  };

  it("matches Excel fixture for EMI and first two periods", () => {
    const schedule = buildAmortizationSchedule(excelFixture);
    assert.equal(schedule.length, 300);
    assert.equal(schedule[0]?.paymentMinor, 15_673_789);
    assert.equal(schedule[0]?.interestMinor, 6_238_356);
    assert.equal(schedule[0]?.principalMinor, 9_435_433);
    assert.equal(schedule[0]?.balanceAfterMinor, 2_290_564_567);
    assert.equal(schedule[1]?.interestMinor, 12_425_528);
  });

  it("ends with zero balance and full principal repaid", () => {
    const schedule = buildAmortizationSchedule(excelFixture);
    assert.equal(schedule[299]?.balanceAfterMinor, 0);
    const sumPrincipal = schedule.reduce((s, r) => s + r.principalMinor, 0);
    assert.equal(sumPrincipal, 2_300_000_000);
  });

  it("recalculates payment at rate change (Excel period 25)", () => {
    const schedule = buildAmortizationSchedule({
      ...excelFixture,
      initialRateMonths: 24,
      rateAfterInitialBps: 1000,
    });
    assert.equal(schedule[23]?.paymentMinor, 15_673_789);
    assert.equal(schedule[24]?.paymentMinor, 20_538_688);
    assert.equal(schedule[24]?.interestMinor, 18_813_808);
  });

  it("ends with zero balance (12-month loan)", () => {
    const schedule = buildAmortizationSchedule({
      principalMinor: 1_000_000,
      annualRateBps: 500,
      termMonths: 12,
      startDate: "2026-01-15",
      dueDayOfMonth: 15,
    });
    assert.equal(schedule.length, 12);
    assert.equal(schedule[11]?.balanceAfterMinor, 0);
    const sumPrincipal = schedule.reduce((s, r) => s + r.principalMinor, 0);
    assert.equal(sumPrincipal, 1_000_000);
  });

  it("handles zero-rate rounding on last row", () => {
    const schedule = buildAmortizationSchedule({
      principalMinor: 100_003,
      annualRateBps: 0,
      termMonths: 3,
      startDate: "2026-03-01",
      dueDayOfMonth: 1,
    });
    assert.equal(schedule.length, 3);
    assert.equal(schedule[2]?.balanceAfterMinor, 0);
  });

  it("uses a custom monthly payment when provided", () => {
    const schedule = buildAmortizationSchedule({
      principalMinor: 1_000_000,
      annualRateBps: 500,
      termMonths: 12,
      startDate: "2026-01-15",
      dueDayOfMonth: 15,
      paymentMinor: 90_000,
    });
    assert.equal(schedule[0]?.paymentMinor, 90_000);
    assert.equal(schedule[11]?.balanceAfterMinor, 0);
  });

  it("rejects custom payment below interest", () => {
    assert.throws(
      () =>
        buildAmortizationSchedule({
          principalMinor: 1_000_000,
          annualRateBps: 500,
          termMonths: 12,
          startDate: "2026-01-15",
          dueDayOfMonth: 15,
          paymentMinor: 100,
        }),
      /too low/i,
    );
  });

  it("requires rate after initial period when initial period is shorter than term", () => {
    assert.throws(
      () =>
        buildAmortizationSchedule({
          principalMinor: 1_000_000,
          annualRateBps: 500,
          termMonths: 12,
          startDate: "2026-01-15",
          dueDayOfMonth: 15,
          initialRateMonths: 6,
        }),
      /rate after initial period/i,
    );
  });
});

describe("dueDateForInstallment", () => {
  it("uses start month when due day is on or after start date", () => {
    assert.equal(dueDateForInstallment("2025-04-25", 25, 1), "2025-04-25");
    assert.equal(dueDateForInstallment("2026-01-05", 25, 1), "2026-01-25");
  });

  it("uses next month when due day in start month is before start date", () => {
    assert.equal(dueDateForInstallment("2026-01-28", 25, 1), "2026-02-25");
  });

  it("clamps due day to month length", () => {
    assert.equal(dueDateForInstallment("2026-01-01", 31, 1), "2026-01-31");
    assert.equal(dueDateForInstallment("2026-01-31", 31, 2), "2026-02-28");
  });
});

describe("computeLoanSummary", () => {
  it("tracks percent and schedule delta", () => {
    const schedule = buildAmortizationSchedule({
      principalMinor: 100_000,
      annualRateBps: 0,
      termMonths: 4,
      startDate: "2026-01-01",
      dueDayOfMonth: 1,
    });
    const installments = schedule.map((r) => ({
      installmentNumber: r.installmentNumber,
      principalMinor: r.principalMinor,
      status:
        r.installmentNumber <= 2 ? ("paid" as const) : ("pending" as const),
      dueDate: r.dueDate,
    }));
    const summary = computeLoanSummary({
      principalMinor: 100_000,
      schedule,
      installments,
      today: "2026-03-15",
    });
    assert.equal(summary.totalPaidMinor, 50_000);
    assert.equal(summary.percentComplete, 50);
    assert.ok(summary.monthsAheadBehind <= 0);
  });
});

describe("buildProgressChartSeries", () => {
  it("returns one point per installment", () => {
    const schedule = buildAmortizationSchedule({
      principalMinor: 60_000,
      annualRateBps: 0,
      termMonths: 3,
      startDate: "2026-01-01",
      dueDayOfMonth: 10,
    });
    const installments = schedule.map((r) => ({
      installmentNumber: r.installmentNumber,
      principalMinor: r.principalMinor,
      status: "pending" as const,
      dueDate: r.dueDate,
    }));
    const series = buildProgressChartSeries({
      schedule,
      installments,
      principalMinor: 60_000,
    });
    assert.equal(series.length, 3);
    assert.equal(series[2]?.scheduledCumulativeMinor, 60_000);
  });
});
