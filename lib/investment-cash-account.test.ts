import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { preferredInvestmentCashAccountId } from "@/lib/investment-cash-account";

describe("preferredInvestmentCashAccountId", () => {
  it("prefers an explicit account over the instrument default", () => {
    assert.equal(
      preferredInvestmentCashAccountId("aaaa", "bbbb"),
      "aaaa",
    );
  });

  it("uses the instrument account when none is sent", () => {
    assert.equal(preferredInvestmentCashAccountId(null, "bbbb"), "bbbb");
    assert.equal(preferredInvestmentCashAccountId("", "bbbb"), "bbbb");
  });

  it("returns null when neither is set", () => {
    assert.equal(preferredInvestmentCashAccountId(null, null), null);
    assert.equal(preferredInvestmentCashAccountId(undefined, ""), null);
  });
});
