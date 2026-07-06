import { describe, expect, it } from "vitest";
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
    expect(computeMonthlyPaymentMinor(120_000, 0, 12)).toBe(10_000);
  });

  it("computes PMT EMI for 2.3B VND at 6.6% over 300 months", () => {
    const principal = 2_300_000_000;
    const rateBps = 660;
    const term = 300;
    expect(computeMonthlyPaymentMinor(principal, rateBps, term)).toBe(
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
    expect(
      computeFirstMonthInterestMinor(
        principal,
        rateBps,
        startDate,
        dueDay,
      ),
    ).toBe(Math.round((principal * rateBps * days) / (10_000 * 365)));
    expect(
      computeFirstMonthInterestMinor(
        principal,
        rateBps,
        startDate,
        dueDay,
      ),
    ).toBe(6_238_356);
  });
});

describe("daysBetweenExclusive", () => {
  it("counts Apr 10 to Apr 25 as 15 days", () => {
    expect(daysBetweenExclusive("2025-04-10", "2025-04-25")).toBe(15);
  });

  it("counts Jan 15 to Feb 15 as 31 days", () => {
    expect(daysBetweenExclusive("2026-01-15", "2026-02-15")).toBe(31);
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
    expect(schedule).toHaveLength(300);
    expect(schedule[0]?.paymentMinor).toBe(15_673_789);
    expect(schedule[0]?.interestMinor).toBe(6_238_356);
    expect(schedule[0]?.principalMinor).toBe(9_435_433);
    expect(schedule[0]?.balanceAfterMinor).toBe(2_290_564_567);
    expect(schedule[1]?.interestMinor).toBe(12_425_528);
  });

  it("ends with zero balance and full principal repaid", () => {
    const schedule = buildAmortizationSchedule(excelFixture);
    expect(schedule[299]?.balanceAfterMinor).toBe(0);
    const sumPrincipal = schedule.reduce((s, r) => s + r.principalMinor, 0);
    expect(sumPrincipal).toBe(2_300_000_000);
  });

  it("recalculates payment at rate change (Excel period 25)", () => {
    const schedule = buildAmortizationSchedule({
      ...excelFixture,
      initialRateMonths: 24,
      rateAfterInitialBps: 1000,
    });
    expect(schedule[23]?.paymentMinor).toBe(15_673_789);
    expect(schedule[24]?.paymentMinor).toBe(20_538_688);
    expect(schedule[24]?.interestMinor).toBe(18_813_808);
  });

  it("ends with zero balance (12-month loan)", () => {
    const schedule = buildAmortizationSchedule({
      principalMinor: 1_000_000,
      annualRateBps: 500,
      termMonths: 12,
      startDate: "2026-01-15",
      dueDayOfMonth: 15,
    });
    expect(schedule).toHaveLength(12);
    expect(schedule[11]?.balanceAfterMinor).toBe(0);
    const sumPrincipal = schedule.reduce((s, r) => s + r.principalMinor, 0);
    expect(sumPrincipal).toBe(1_000_000);
  });

  it("handles zero-rate rounding on last row", () => {
    const schedule = buildAmortizationSchedule({
      principalMinor: 100_003,
      annualRateBps: 0,
      termMonths: 3,
      startDate: "2026-03-01",
      dueDayOfMonth: 1,
    });
    expect(schedule).toHaveLength(3);
    expect(schedule[2]?.balanceAfterMinor).toBe(0);
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
    expect(schedule[0]?.paymentMinor).toBe(90_000);
    expect(schedule[11]?.balanceAfterMinor).toBe(0);
  });

  it("rejects custom payment below interest", () => {
    expect(() =>
      buildAmortizationSchedule({
        principalMinor: 1_000_000,
        annualRateBps: 500,
        termMonths: 12,
        startDate: "2026-01-15",
        dueDayOfMonth: 15,
        paymentMinor: 100,
      }),
    ).toThrow(/too low/i);
  });

  it("requires rate after initial period when initial period is shorter than term", () => {
    expect(() =>
      buildAmortizationSchedule({
        principalMinor: 1_000_000,
        annualRateBps: 500,
        termMonths: 12,
        startDate: "2026-01-15",
        dueDayOfMonth: 15,
        initialRateMonths: 6,
      }),
    ).toThrow(/rate after initial period/i);
  });
});

describe("dueDateForInstallment", () => {
  it("uses start month when due day is on or after start date", () => {
    expect(dueDateForInstallment("2025-04-25", 25, 1)).toBe("2025-04-25");
    expect(dueDateForInstallment("2026-01-05", 25, 1)).toBe("2026-01-25");
  });

  it("uses next month when due day in start month is before start date", () => {
    expect(dueDateForInstallment("2026-01-28", 25, 1)).toBe("2026-02-25");
  });

  it("clamps due day to month length", () => {
    expect(dueDateForInstallment("2026-01-01", 31, 1)).toBe("2026-01-31");
    expect(dueDateForInstallment("2026-01-31", 31, 2)).toBe("2026-02-28");
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
      status: r.installmentNumber <= 2 ? ("paid" as const) : ("pending" as const),
      dueDate: r.dueDate,
    }));
    const summary = computeLoanSummary({
      principalMinor: 100_000,
      schedule,
      installments,
      today: "2026-03-15",
    });
    expect(summary.totalPaidMinor).toBe(50_000);
    expect(summary.percentComplete).toBe(50);
    expect(summary.monthsAheadBehind).toBeLessThanOrEqual(0);
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
    expect(series).toHaveLength(3);
    expect(series[2]?.scheduledCumulativeMinor).toBe(60_000);
  });
});
