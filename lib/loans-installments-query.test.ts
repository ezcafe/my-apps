import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { installmentRowMatchesQuery } from "@/lib/loans-services/installments-list";
import { loansInstallmentsQuerySchema } from "@/lib/validators/loans";

describe("loansInstallmentsQuerySchema", () => {
  it("accepts empty query", () => {
    assert.deepEqual(loansInstallmentsQuerySchema.parse({}), {});
  });

  it("rejects bad dates", () => {
    assert.throws(() => loansInstallmentsQuerySchema.parse({ from: "2026/09/01" }));
    assert.throws(() => loansInstallmentsQuerySchema.parse({ to: "nope" }));
  });

  it("rejects from after to", () => {
    assert.throws(() =>
      loansInstallmentsQuerySchema.parse({
        from: "2026-09-30",
        to: "2026-09-01",
      }),
    );
  });

  it("rejects limit out of range", () => {
    assert.throws(() => loansInstallmentsQuerySchema.parse({ limit: 0 }));
    assert.throws(() => loansInstallmentsQuerySchema.parse({ limit: 201 }));
  });

  it("rejects bad status", () => {
    assert.throws(() =>
      loansInstallmentsQuerySchema.parse({ status: "open" }),
    );
  });
});

describe("installmentRowMatchesQuery", () => {
  const row = {
    loanId: "11111111-1111-1111-1111-111111111111",
    dueDate: "2026-09-15",
    status: "paid",
    scheduleInstallmentId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  };

  it("filters by loanId + dueDate range + status", () => {
    assert.equal(
      installmentRowMatchesQuery(row, {
        loanId: row.loanId,
        from: "2026-09-01",
        to: "2026-09-30",
        status: "paid",
      }),
      true,
    );
    assert.equal(
      installmentRowMatchesQuery(row, {
        loanId: "22222222-2222-2222-2222-222222222222",
      }),
      false,
    );
    assert.equal(
      installmentRowMatchesQuery(row, { from: "2026-09-16" }),
      false,
    );
    assert.equal(
      installmentRowMatchesQuery(row, { status: "pending" }),
      false,
    );
  });

  it("empty result path — no match yields empty list", () => {
    const items = [row].filter((r) =>
      installmentRowMatchesQuery(r, {
        from: "2027-01-01",
        to: "2027-01-31",
      }),
    );
    assert.deepEqual(items, []);
  });
});
