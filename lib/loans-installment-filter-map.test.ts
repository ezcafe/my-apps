import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loanInstallmentsFilterToStatus } from "@/lib/loans-installment-filter-map";

describe("loanInstallmentsFilterToStatus", () => {
  it("maps upcoming → pending, paid → paid, all → omit", () => {
    assert.equal(loanInstallmentsFilterToStatus("upcoming"), "pending");
    assert.equal(loanInstallmentsFilterToStatus("paid"), "paid");
    assert.equal(loanInstallmentsFilterToStatus("all"), undefined);
  });
});
