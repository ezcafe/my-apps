import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodeLoansInstallmentCursor,
  encodeLoansInstallmentCursor,
} from "@/lib/loans-installment-cursor";
import {
  installmentRowMatchesQuery,
  loansInstallmentKeysetAfter,
} from "@/lib/loans-services/installments-list";

describe("listLoansInstallments order / keyset (P7)", () => {
  it("keyset after predicate matches installmentNumber ASC, id ASC", () => {
    const cursor = encodeLoansInstallmentCursor({
      installmentNumber: 2,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    const key = decodeLoansInstallmentCursor(cursor);
    assert.ok(key);

    assert.equal(
      loansInstallmentKeysetAfter(
        { installmentNumber: 1, id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
        key,
      ),
      false,
    );
    assert.equal(
      loansInstallmentKeysetAfter(
        { installmentNumber: 2, id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
        key,
      ),
      false,
    );
    assert.equal(
      loansInstallmentKeysetAfter(
        { installmentNumber: 2, id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
        key,
      ),
      true,
    );
    assert.equal(
      loansInstallmentKeysetAfter(
        { installmentNumber: 3, id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
        key,
      ),
      true,
    );
  });

  it("installmentRowMatchesQuery uses schedule keyset cursor not UUID-only gt", () => {
    const cursor = encodeLoansInstallmentCursor({
      installmentNumber: 2,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    assert.equal(
      installmentRowMatchesQuery(
        {
          loanId: "loan",
          dueDate: "2026-03-01",
          status: "pending",
          scheduleInstallmentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          installmentNumber: 3,
        },
        { loanId: "loan", cursor },
      ),
      true,
    );
    assert.equal(
      installmentRowMatchesQuery(
        {
          loanId: "loan",
          dueDate: "2026-02-01",
          status: "pending",
          scheduleInstallmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          installmentNumber: 1,
        },
        { loanId: "loan", cursor },
      ),
      false,
    );
  });
});
