import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveMoneyAppHeader } from "@/lib/money-app-header";

describe("resolveMoneyAppHeader", () => {
  it("resolves list / capture section titles and CTAs without breadcrumbs", () => {
    assert.deepEqual(resolveMoneyAppHeader("/money"), {
      title: "Spending",
      breadcrumbs: [],
      cta: { href: "/money/new", label: "Add transaction" },
    });
    assert.equal(resolveMoneyAppHeader("/money/insights").title, "Insights");
    assert.equal(resolveMoneyAppHeader("/money/new").title, "Add transaction");
    assert.equal(resolveMoneyAppHeader("/money/new").cta, null);
  });

  it("uses subsection title + Settings crumbs on money settings children", () => {
    assert.deepEqual(resolveMoneyAppHeader("/money/settings/accounts"), {
      title: "Accounts",
      breadcrumbs: [
        { label: "Settings", href: "/money/settings" },
        { label: "Accounts" },
      ],
      cta: null,
    });
    assert.equal(
      resolveMoneyAppHeader("/money/settings/categories").title,
      "Categories",
    );
  });

  it("keeps Money settings hub title without crumbs", () => {
    assert.deepEqual(resolveMoneyAppHeader("/money/settings"), {
      title: "Money settings",
      breadcrumbs: [],
      cta: { href: "/money/new", label: "Add transaction" },
    });
  });

  it("marks transaction edit for override", () => {
    const header = resolveMoneyAppHeader("/money/transactions/tx-1");
    assert.equal(header.title, "Edit transaction");
    assert.equal(header.cta, null);
    assert.deepEqual(header.breadcrumbs, []);
    assert.equal(header.needsOverride, true);
  });
});
