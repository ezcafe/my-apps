import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { moneySectionPrimaryCta } from "@/lib/money-section-primary-cta";

describe("moneySectionPrimaryCta", () => {
  it("returns section CTAs on list routes", () => {
    assert.deepEqual(moneySectionPrimaryCta("/money"), {
      href: "/money/new",
      label: "Add transaction",
    });
    assert.equal(moneySectionPrimaryCta("/money/bills")?.label, "Add bill expense");
    assert.equal(moneySectionPrimaryCta("/money/savings")?.label, "Record a transfer");
  });

  it("returns null on create forms", () => {
    assert.equal(moneySectionPrimaryCta("/money/new"), null);
  });

  it("defaults Add transaction on insights, import, money settings hub", () => {
    assert.deepEqual(moneySectionPrimaryCta("/money/insights"), {
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
