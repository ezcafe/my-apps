import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countLoanInstallmentsForDetail,
  nextPendingInstallment,
} from "@/lib/loans-detail-client-contract";

describe("countLoanInstallmentsForDetail", () => {
  it("counts paid and overdue without scanning needing a client array consumer", () => {
    const counts = countLoanInstallmentsForDetail(
      [
        {
          status: "paid",
          dueDate: "2026-01-01",
          paymentMinor: 100,
          scheduleInstallmentId: "a",
          installmentNumber: 1,
        },
        {
          status: "pending",
          dueDate: "2026-02-01",
          paymentMinor: 100,
          scheduleInstallmentId: "b",
          installmentNumber: 2,
        },
        {
          status: "pending",
          dueDate: "2026-11-01",
          paymentMinor: 110,
          scheduleInstallmentId: "c",
          installmentNumber: 3,
        },
      ],
      "2026-10-15",
    );
    assert.deepEqual(counts, {
      installmentCount: 3,
      paidInstallmentCount: 1,
      overdueInstallmentCount: 1,
    });
  });
});

describe("nextPendingInstallment", () => {
  it("returns first pending for nextPaymentMinor", () => {
    const next = nextPendingInstallment([
      {
        status: "paid",
        dueDate: "2026-01-01",
        paymentMinor: 100,
        scheduleInstallmentId: "a",
        installmentNumber: 1,
      },
      {
        status: "pending",
        dueDate: "2026-11-01",
        paymentMinor: 250,
        scheduleInstallmentId: "b",
        installmentNumber: 2,
      },
    ]);
    assert.equal(next?.paymentMinor, 250);
    assert.equal(next?.scheduleInstallmentId, "b");
  });
});
