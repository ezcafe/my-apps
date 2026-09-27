import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  loansDrilldownForLoanRemaining,
  loansDrilldownForPaidInRange,
} from "@/lib/loans-chart-drilldown";

describe("loans chart drilldown builders", () => {
  it("maps remaining pie click to loanId query + openLoanId", () => {
    const payload = loansDrilldownForLoanRemaining({
      loanId: "11111111-1111-1111-1111-111111111111",
      label: "Home",
    });
    assert.equal(payload.query.loanId, "11111111-1111-1111-1111-111111111111");
    assert.equal(payload.openLoanId, "11111111-1111-1111-1111-111111111111");
    assert.match(payload.title, /Home/);
  });

  it("maps paid range click to paid status + dates", () => {
    const payload = loansDrilldownForPaidInRange({
      from: "2026-09-01",
      to: "2026-09-30",
    });
    assert.equal(payload.query.status, "paid");
    assert.equal(payload.query.from, "2026-09-01");
    assert.equal(payload.query.to, "2026-09-30");
  });

  it("strips time from ISO range keys for installments query", () => {
    const payload = loansDrilldownForPaidInRange({
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T23:59:59.999Z",
    });
    assert.equal(payload.query.from, "2026-09-01");
    assert.equal(payload.query.to, "2026-09-30");
  });
});
