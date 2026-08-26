import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveLoanAppHeader } from "@/lib/loan-app-header";

describe("resolveLoanAppHeader", () => {
  it("exposes create CTA on the list and insights", () => {
    assert.deepEqual(resolveLoanAppHeader("/loans"), {
      title: "Loans",
      breadcrumbs: [],
      cta: { href: "/loans/new", label: "Create loan" },
    });
    assert.equal(resolveLoanAppHeader("/loans/insights").title, "Insights");
    assert.deepEqual(resolveLoanAppHeader("/loans/insights").cta, {
      href: "/loans/new",
      label: "Create loan",
    });
  });

  it("hides CTA on create and settings", () => {
    assert.equal(resolveLoanAppHeader("/loans/new").cta, null);
    assert.equal(resolveLoanAppHeader("/loans/new").title, "Create loan");
    assert.equal(resolveLoanAppHeader("/loans/settings").cta, null);
    assert.equal(resolveLoanAppHeader("/loans/settings").title, "Loans settings");
  });

  it("marks loan detail for override", () => {
    const header = resolveLoanAppHeader("/loans/abc-123");
    assert.equal(header.title, "Loan");
    assert.equal(header.cta, null);
    assert.deepEqual(header.breadcrumbs, [
      { label: "Loans", href: "/loans" },
      { label: "Loan" },
    ]);
    assert.equal(header.needsOverride, true);
  });
});
