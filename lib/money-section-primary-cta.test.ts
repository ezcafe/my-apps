import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { moneySectionPrimaryCta } from "@/lib/money-section-primary-cta";

describe("moneySectionPrimaryCta", () => {
  it("returns section CTAs on list routes", () => {
    assert.deepEqual(moneySectionPrimaryCta("/money/spending"), {
      href: "/money/new",
      label: "Add transaction",
    });
    assert.equal(moneySectionPrimaryCta("/money/bills")?.label, "Add bill expense");
    assert.equal(moneySectionPrimaryCta("/money/savings")?.label, "Record a transfer");
    assert.deepEqual(moneySectionPrimaryCta("/money/loans"), {
      href: "/money/loans/new",
      label: "Create loan",
    });
    assert.deepEqual(moneySectionPrimaryCta("/money/investments"), {
      href: "/money/investments/new",
      label: "Record activity",
    });
  });

  it("returns null on create forms", () => {
    assert.equal(moneySectionPrimaryCta("/money/new"), null);
    assert.equal(moneySectionPrimaryCta("/money/loans/new"), null);
    assert.equal(moneySectionPrimaryCta("/money/investments/new"), null);
  });

  it("returns null on loan/investment detail and module settings", () => {
    assert.equal(moneySectionPrimaryCta("/money/loans/abc-123"), null);
    assert.equal(moneySectionPrimaryCta("/money/loans/settings"), null);
    assert.equal(moneySectionPrimaryCta("/money/investments/settings"), null);
  });

  it("defaults Add transaction on insights, import, money settings hub", () => {
    assert.deepEqual(moneySectionPrimaryCta("/money/analytics"), {
      href: "/money/new",
      label: "Add transaction",
    });
    assert.deepEqual(moneySectionPrimaryCta("/money/import"), {
      href: "/money/new",
      label: "Add transaction",
    });
    assert.deepEqual(moneySectionPrimaryCta("/money/settings"), {
      href: "/money/new",
      label: "Add transaction",
    });
  });

  it("returns null on money settings children", () => {
    assert.equal(moneySectionPrimaryCta("/money/settings/accounts"), null);
    assert.equal(moneySectionPrimaryCta("/money/settings/categories"), null);
  });
});
