import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countLoansDueUrgency,
  daysUntilDue,
  isDueSoon,
  isOverdue,
} from "@/lib/loans-due";

const today = "2026-09-27";

function loan(
  partial: Partial<{
    id: string;
    status: string;
    nextDueDate: string | null;
  }> = {},
) {
  return {
    id: partial.id ?? "loan",
    status: partial.status ?? "active",
    nextDueDate: partial.nextDueDate ?? null,
  };
}

describe("daysUntilDue", () => {
  it("returns negative when due date is before today", () => {
    assert.equal(daysUntilDue("2026-09-20", today), -7);
  });

  it("returns 0 on the due date", () => {
    assert.equal(daysUntilDue(today, today), 0);
  });

  it("returns positive when due date is after today", () => {
    assert.equal(daysUntilDue("2026-10-04", today), 7);
  });
});

describe("isOverdue", () => {
  it("is true when nextDue is before today and not paid_off", () => {
    assert.equal(
      isOverdue(loan({ nextDueDate: "2026-09-20" }), today),
      true,
    );
  });

  it("is false when paid_off even if nextDue is past", () => {
    assert.equal(
      isOverdue(
        loan({ status: "paid_off", nextDueDate: "2026-09-01" }),
        today,
      ),
      false,
    );
  });

  it("is false when nextDueDate is null", () => {
    assert.equal(isOverdue(loan({ nextDueDate: null }), today), false);
  });
});

describe("isDueSoon", () => {
  it("is true when 0…7 days inclusive and not overdue", () => {
    assert.equal(isDueSoon(loan({ nextDueDate: today }), today), true);
    assert.equal(
      isDueSoon(loan({ nextDueDate: "2026-10-04" }), today),
      true,
    );
  });

  it("is false when more than 7 days away", () => {
    assert.equal(
      isDueSoon(loan({ nextDueDate: "2026-10-05" }), today),
      false,
    );
  });

  it("is false when overdue (past due)", () => {
    assert.equal(
      isDueSoon(loan({ nextDueDate: "2026-09-26" }), today),
      false,
    );
  });

  it("is false when paid_off", () => {
    assert.equal(
      isDueSoon(
        loan({ status: "paid_off", nextDueDate: today }),
        today,
      ),
      false,
    );
  });
});

describe("countLoansDueUrgency", () => {
  it("counts overdue and due-soon; due-soon excludes overdue", () => {
    const rows = [
      loan({ id: "overdue", nextDueDate: "2026-09-20" }),
      loan({ id: "soon", nextDueDate: "2026-09-30" }),
      loan({ id: "paid", status: "paid_off", nextDueDate: "2026-09-01" }),
      loan({ id: "later", nextDueDate: "2026-11-01" }),
    ];
    assert.deepEqual(countLoansDueUrgency(rows, today), {
      overdue: 1,
      dueSoon: 1,
    });
  });

  it("returns zeros when nothing is urgent", () => {
    assert.deepEqual(
      countLoansDueUrgency(
        [loan({ nextDueDate: "2026-12-01" }), loan({ status: "paid_off" })],
        today,
      ),
      { overdue: 0, dueSoon: 0 },
    );
  });
});
