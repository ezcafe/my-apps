import { describe, expect, it } from "vitest";
import {
  buildAmortizationSchedule,
  buildProgressChartSeries,
  computeActual365EmiMinor,
  computeFirstMonthInterestMinor,
  computeLoanSummary,
  computeMonthlyPaymentMinor,
  computeScVnEmiMinor,
  daysBetweenExclusive,
  dueDateForInstallment,
} from "./loans-amortization";

describe("computeMonthlyPaymentMinor", () => {
  it("splits principal evenly at zero rate", () => {
    expect(computeMonthlyPaymentMinor(120_000, 0, 12)).toBe(10_000);
  });

  it("computes positive interest payment", () => {
    const pmt = computeMonthlyPaymentMinor(1_000_000, 600, 360);
    expect(pmt).toBeGreaterThan(5990);
    expect(pmt).toBeLessThan(6000);
  });
});

describe("computeScVnEmiMinor", () => {
  it("matches SC JS formula for 2B VND at 8% over 240 months", () => {
    const principal = 2_000_000_000;
    const rateBps = 800;
    const term = 240;
    const r = rateBps / 100 / 1200;
    const expected = principal / ((1 - (1 + r) ** -term) / r);
    expect(computeScVnEmiMinor(principal, rateBps, term)).toBe(
      Math.round(expected),
    );
  });

  it("matches computeMonthlyPaymentMinor when method is sc_vn_calculator", () => {
    const args = [2_000_000_000, 800, 240] as const;
    expect(computeMonthlyPaymentMinor(...args, "sc_vn_calculator")).toBe(
      computeScVnEmiMinor(...args),
    );
  });
});

describe("computeFirstMonthInterestMinor", () => {
  it("matches SC first-month interest preview (principal * rate / 1200)", () => {
    const principal = 2_000_000_000;
    const rateBps = 800;
    expect(
      computeFirstMonthInterestMinor(principal, rateBps, "sc_vn_calculator"),
    ).toBe(Math.round((principal * rateBps) / 120_000));
  });

  it("uses actual days for sc_vn_actual_365", () => {
    const principal = 1_000_000_000;
    const rateBps = 800;
    const startDate = "2026-01-15";
    const dueDay = 15;
    const dueDate = dueDateForInstallment(startDate, dueDay, 1);
    const days = daysBetweenExclusive(startDate, dueDate);
    expect(
      computeFirstMonthInterestMinor(
        principal,
        rateBps,
        "sc_vn_actual_365",
        startDate,
        dueDay,
      ),
    ).toBe(Math.round((principal * rateBps * days) / (10_000 * 365)));
  });
});

describe("daysBetweenExclusive", () => {
  it("counts Jan 15 to Feb 15 as 31 days", () => {
    expect(daysBetweenExclusive("2026-01-15", "2026-02-15")).toBe(31);
  });

  it("counts Feb 28 to Mar 28 in non-leap year as 28 days", () => {
    expect(daysBetweenExclusive("2026-02-28", "2026-03-28")).toBe(28);
  });
});

describe("buildAmortizationSchedule", () => {
  it("ends with zero balance (nominal_monthly)", () => {
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

  it("ends with zero balance (sc_vn_calculator)", () => {
    const schedule = buildAmortizationSchedule({
      principalMinor: 1_000_000,
      annualRateBps: 500,
      termMonths: 12,
      startDate: "2026-01-15",
      dueDayOfMonth: 15,
      calculationMethod: "sc_vn_calculator",
    });
    expect(schedule).toHaveLength(12);
    expect(schedule[11]?.balanceAfterMinor).toBe(0);
    const sumPrincipal = schedule.reduce((s, r) => s + r.principalMinor, 0);
    expect(sumPrincipal).toBe(1_000_000);
  });

  it("ends with zero balance (sc_vn_actual_365)", () => {
    const schedule = buildAmortizationSchedule({
      principalMinor: 1_000_000,
      annualRateBps: 500,
      termMonths: 12,
      startDate: "2026-01-15",
      dueDayOfMonth: 15,
      calculationMethod: "sc_vn_actual_365",
    });
    expect(schedule).toHaveLength(12);
    expect(schedule[11]?.balanceAfterMinor).toBe(0);
    const sumPrincipal = schedule.reduce((s, r) => s + r.principalMinor, 0);
    expect(sumPrincipal).toBe(1_000_000);
  });

  it("sc_vn_calculator first row matches SC JS loop", () => {
    const principal = 1_000_000;
    const rateBps = 500;
    const term = 12;
    const ratePercent = rateBps / 100;
    const emi =
      principal / ((1 - (1 + ratePercent / 1200) ** -term) / (ratePercent / 1200));
    const interestFloat = (principal * ratePercent) / 100 / 12;
    const principalFloat = emi - interestFloat;

    const schedule = buildAmortizationSchedule({
      principalMinor: principal,
      annualRateBps: rateBps,
      termMonths: term,
      startDate: "2026-01-15",
      dueDayOfMonth: 15,
      calculationMethod: "sc_vn_calculator",
    });

    expect(schedule[0]?.interestMinor).toBe(
      Number.parseFloat(interestFloat.toFixed(0)),
    );
    expect(schedule[0]?.principalMinor).toBe(
      Number.parseFloat(principalFloat.toFixed(0)),
    );
    expect(schedule[0]?.paymentMinor).toBe(Number.parseFloat(emi.toFixed(0)));
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
});

describe("computeActual365EmiMinor", () => {
  it("zeros balance at end of term", () => {
    const principal = 1_000_000;
    const rateBps = 500;
    const term = 12;
    const startDate = "2026-01-15";
    const dueDay = 15;
    const emi = computeActual365EmiMinor(
      principal,
      rateBps,
      term,
      startDate,
      dueDay,
    );
    const schedule = buildAmortizationSchedule({
      principalMinor: principal,
      annualRateBps: rateBps,
      termMonths: term,
      startDate,
      dueDayOfMonth: dueDay,
      calculationMethod: "sc_vn_actual_365",
      paymentMinor: emi,
    });
    expect(schedule[schedule.length - 1]?.balanceAfterMinor).toBe(0);
  });
});

describe("dueDateForInstallment", () => {
  it("clamps due day to month length", () => {
    expect(dueDateForInstallment("2026-01-31", 31, 1)).toBe("2026-02-28");
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
