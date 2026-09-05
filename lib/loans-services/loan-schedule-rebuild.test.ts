import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planLoanScheduleRebuild } from "@/lib/loans-services/loan-schedule-rebuild";
import { loanUpdateSchema } from "@/lib/validators/loans";

const LOAN_ID = "11111111-1111-4111-8111-111111111111";

const baseTerms = {
  principalMinor: 100_000_00,
  annualRateBps: 525,
  termMonths: 12,
  startDate: "2024-01-10",
  dueDayOfMonth: 25,
};

describe("loanUpdateSchema", () => {
  it("accepts full update payload", () => {
    const parsed = loanUpdateSchema.safeParse({
      id: LOAN_ID,
      name: "Home loan",
      ...baseTerms,
      paymentMinor: 90_000,
      moneyAccountId: null,
      moneyCategoryId: null,
    });
    assert.equal(parsed.success, true);
  });

  it("requires rate after initial when period is partial", () => {
    const parsed = loanUpdateSchema.safeParse({
      id: LOAN_ID,
      name: "Home loan",
      ...baseTerms,
      initialRateMonths: 6,
      rateAfterInitialBps: null,
    });
    assert.equal(parsed.success, false);
  });

  it("rejects missing id", () => {
    const parsed = loanUpdateSchema.safeParse({
      name: "Home loan",
      ...baseTerms,
    });
    assert.equal(parsed.success, false);
  });
});

describe("planLoanScheduleRebuild", () => {
  it("rebuilds full schedule when nothing is paid", () => {
    const plan = planLoanScheduleRebuild(
      [
        {
          scheduleInstallmentId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          installmentNumber: 1,
          dueDate: "2024-01-25",
          principalMinor: 8000_00,
          status: "pending",
        },
      ],
      baseTerms,
    );
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.equal(plan.paidCount, 0);
    assert.equal(plan.remainingPrincipal, baseTerms.principalMinor);
    assert.equal(plan.pendingIdsToDelete.length, 1);
    assert.ok(plan.newSchedule);
    assert.equal(plan.newSchedule!.length, 12);
    assert.equal(plan.newSchedule![0]!.installmentNumber, 1);
    assert.equal(plan.status, "active");
  });

  it("keeps paid prefix and renumbers unpaid rows", () => {
    const plan = planLoanScheduleRebuild(
      [
        {
          scheduleInstallmentId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          installmentNumber: 1,
          dueDate: "2024-01-25",
          principalMinor: 50_000_00,
          status: "paid",
        },
        {
          scheduleInstallmentId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          installmentNumber: 2,
          dueDate: "2024-02-25",
          principalMinor: 40_000_00,
          status: "pending",
        },
      ],
      { ...baseTerms, termMonths: 6 },
    );
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.equal(plan.paidCount, 1);
    assert.equal(plan.remainingPrincipal, 50_000_00);
    assert.deepEqual(plan.pendingIdsToDelete, [
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    ]);
    assert.ok(plan.newSchedule);
    assert.equal(plan.newSchedule!.length, 5);
    assert.equal(plan.newSchedule![0]!.installmentNumber, 2);
    assert.equal(plan.status, "active");
  });

  it("rejects principal below paid principal", () => {
    const plan = planLoanScheduleRebuild(
      [
        {
          scheduleInstallmentId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          installmentNumber: 1,
          dueDate: "2024-01-25",
          principalMinor: 80_000_00,
          status: "paid",
        },
      ],
      { ...baseTerms, principalMinor: 50_000_00 },
    );
    assert.equal(plan.ok, false);
    if (plan.ok) return;
    assert.match(plan.error, /less than principal already paid/i);
  });

  it("rejects term shorter than paid count", () => {
    const plan = planLoanScheduleRebuild(
      [
        {
          scheduleInstallmentId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          installmentNumber: 1,
          dueDate: "2024-01-25",
          principalMinor: 10_000_00,
          status: "paid",
        },
        {
          scheduleInstallmentId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          installmentNumber: 2,
          dueDate: "2024-02-25",
          principalMinor: 10_000_00,
          status: "paid",
        },
      ],
      { ...baseTerms, termMonths: 1 },
    );
    assert.equal(plan.ok, false);
    if (plan.ok) return;
    assert.match(plan.error, /shorter than the number of paid/i);
  });

  it("marks paid_off when remaining principal is zero", () => {
    const plan = planLoanScheduleRebuild(
      [
        {
          scheduleInstallmentId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          installmentNumber: 1,
          dueDate: "2024-01-25",
          principalMinor: 100_000_00,
          status: "paid",
        },
      ],
      { ...baseTerms, termMonths: 1, paymentMinor: 100_000_00 },
    );
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.equal(plan.remainingPrincipal, 0);
    assert.equal(plan.newSchedule, null);
    assert.equal(plan.status, "paid_off");
  });

  it("uses post-change rate after paid initial period", () => {
    const plan = planLoanScheduleRebuild(
      [
        {
          scheduleInstallmentId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          installmentNumber: 1,
          dueDate: "2024-01-25",
          principalMinor: 20_000_00,
          status: "paid",
        },
        {
          scheduleInstallmentId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          installmentNumber: 2,
          dueDate: "2024-02-25",
          principalMinor: 20_000_00,
          status: "paid",
        },
      ],
      {
        ...baseTerms,
        termMonths: 6,
        initialRateMonths: 2,
        rateAfterInitialBps: 800,
        principalMinor: 100_000_00,
      },
    );
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.ok(plan.newSchedule);
    assert.equal(plan.newSchedule!.length, 4);
    assert.equal(plan.newSchedule![0]!.installmentNumber, 3);
  });
});
