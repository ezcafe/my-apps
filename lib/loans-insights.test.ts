import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  combineLoanProgressSeries,
  earliestNextDue,
  monthlyObligation,
  paidPrincipalVsInterest,
  portfolioLtvPct,
  remainingByLoan,
  remainingInterestMinor,
  remainingTotal,
  weightedAprBps,
} from "@/lib/loans-insights";

const loans = [
  {
    id: "a",
    name: "Home",
    status: "active",
    remainingMinor: 8000,
    paymentMinor: 100,
    annualRateBps: 500,
    nextDueDate: "2026-09-25",
    percentComplete: 20,
    collateralValueMinor: 20000,
  },
  {
    id: "b",
    name: "Car",
    status: "active",
    remainingMinor: 2000,
    paymentMinor: 50,
    annualRateBps: 800,
    nextDueDate: "2026-08-25",
    percentComplete: 40,
    collateralValueMinor: null,
  },
  {
    id: "c",
    name: "Done",
    status: "paid_off",
    remainingMinor: 0,
    paymentMinor: 0,
    annualRateBps: 300,
    nextDueDate: null,
    percentComplete: 100,
    collateralValueMinor: 5000,
  },
];

describe("loans insights aggregations", () => {
  it("sums remaining and monthly obligation on active loans", () => {
    assert.equal(remainingTotal(loans), 10000);
    assert.equal(monthlyObligation(loans), 150);
  });

  it("weights APR by remaining balance", () => {
    assert.equal(weightedAprBps(loans), 560);
    assert.equal(weightedAprBps([]), null);
  });

  it("picks the earliest next due", () => {
    assert.equal(earliestNextDue(loans), "2026-08-25");
  });

  it("slices remaining by loan for the allocation pie", () => {
    assert.deepEqual(remainingByLoan(loans), [
      { id: "a", label: "Home", valueMinor: 8000 },
      { id: "b", label: "Car", valueMinor: 2000 },
    ]);
  });

  it("splits paid principal vs interest", () => {
    assert.deepEqual(
      paidPrincipalVsInterest([
        { status: "paid", principalMinor: 80, interestMinor: 20 },
        { status: "pending", principalMinor: 90, interestMinor: 10 },
        { status: "paid", principalMinor: 40, interestMinor: 5 },
      ]),
      { principalMinor: 120, interestMinor: 25 },
    );
    assert.equal(
      remainingInterestMinor([
        { status: "paid", interestMinor: 20 },
        { status: "pending", interestMinor: 10 },
      ]),
      10,
    );
  });

  it("filters paid principal vs interest by paidAt then dueDate", () => {
    const rows = [
      {
        status: "paid",
        principalMinor: 80,
        interestMinor: 20,
        paidAt: "2026-08-10T12:00:00.000Z",
        dueDate: "2026-07-01",
      },
      {
        status: "paid",
        principalMinor: 40,
        interestMinor: 5,
        paidAt: null,
        dueDate: "2026-08-20",
      },
      {
        status: "paid",
        principalMinor: 99,
        interestMinor: 1,
        paidAt: "2026-07-15T00:00:00.000Z",
        dueDate: "2026-08-01",
      },
    ];
    assert.deepEqual(paidPrincipalVsInterest(rows, { from: "2026-08-01", to: "2026-08-31" }), {
      principalMinor: 120,
      interestMinor: 25,
    });
  });

  it("computes LTV only from loans with collateral", () => {
    assert.equal(portfolioLtvPct(loans), 40);
    assert.equal(
      portfolioLtvPct([{ ...loans[1]!, collateralValueMinor: null }]),
      null,
    );
  });

  it("combines progress series by installment index", () => {
    const combined = combineLoanProgressSeries([
      [
        {
          label: "1",
          scheduledCumulativeMinor: 10,
          actualCumulativeMinor: 8,
          projectedCumulativeMinor: 10,
        },
        {
          label: "2",
          scheduledCumulativeMinor: 20,
          actualCumulativeMinor: 18,
          projectedCumulativeMinor: 20,
        },
      ],
      [
        {
          label: "1",
          scheduledCumulativeMinor: 5,
          actualCumulativeMinor: 5,
          projectedCumulativeMinor: 5,
        },
      ],
    ]);
    assert.equal(combined.length, 2);
    assert.equal(combined[0]?.scheduledCumulativeMinor, 15);
    assert.equal(combined[1]?.scheduledCumulativeMinor, 25);
    assert.equal(combined[1]?.actualCumulativeMinor, 23);
  });
});
