import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveInvestmentAppHeader } from "@/lib/investment-app-header";
import { MONEY_LEDGER_INVESTMENT } from "@/lib/money-ledger-presets";

describe("resolveInvestmentAppHeader", () => {
  it("exposes instrumentsHref and record CTA on the list only", () => {
    assert.deepEqual(resolveInvestmentAppHeader("/investments"), {
      title: "Investments",
      breadcrumbs: [],
      cta: { href: "/investments/new", label: "Record activity" },
      instrumentsHref: "/investments/instruments",
      meta: MONEY_LEDGER_INVESTMENT.description,
    });
    assert.equal(resolveInvestmentAppHeader("/investments/insights").title, "Insights");
    assert.equal(resolveInvestmentAppHeader("/investments/insights").cta, null);
  });

  it("hides CTA on create forms and uses nested crumbs", () => {
    assert.equal(resolveInvestmentAppHeader("/investments/new").cta, null);
    assert.equal(
      resolveInvestmentAppHeader("/investments/new").title,
      "Record activity",
    );
    assert.equal(
      resolveInvestmentAppHeader("/investments/instruments/new").cta,
      null,
    );
    assert.equal(
      resolveInvestmentAppHeader("/investments/instruments").instrumentsHref,
      undefined,
    );
    assert.deepEqual(
      resolveInvestmentAppHeader("/investments/instruments").breadcrumbs,
      [
        { label: "Investments", href: "/investments" },
        { label: "Instruments" },
      ],
    );
    assert.deepEqual(
      resolveInvestmentAppHeader("/investments/instruments").cta,
      {
        href: "/investments/instruments/new",
        label: "Create instrument",
      },
    );
    assert.deepEqual(
      resolveInvestmentAppHeader("/investments/instruments/new").breadcrumbs,
      [
        { label: "Investments", href: "/investments" },
        { label: "Instruments", href: "/investments/instruments" },
        { label: "Create instrument" },
      ],
    );
  });
});
