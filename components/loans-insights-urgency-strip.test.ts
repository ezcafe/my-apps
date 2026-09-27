import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { LoansInsightsUrgencyStrip } from "@/components/loans-insights-urgency-strip";
import { countLoansDueUrgency } from "@/lib/loans-due";

describe("Loans Insights urgency strip", () => {
  it("renders Overdue / Due this week labels and View loans link", () => {
    const html = renderToStaticMarkup(
      createElement(LoansInsightsUrgencyStrip, { overdue: 1, dueSoon: 2 }),
    );
    assert.match(html, /Overdue/);
    assert.match(html, /Due this week/);
    assert.match(html, /1 loan/);
    assert.match(html, />2</);
    assert.match(html, /href="\/loans"/);
    assert.match(html, /View loans/);
    assert.match(html, /alert-warning/);
  });

  it("renders quiet strip when both counts are zero (not an error Alert)", () => {
    const html = renderToStaticMarkup(
      createElement(LoansInsightsUrgencyStrip, { overdue: 0, dueSoon: 0 }),
    );
    assert.match(html, /Overdue/);
    assert.match(html, /Due this week/);
    assert.match(html, />0</);
    assert.doesNotMatch(html, /alert-warning/);
    assert.doesNotMatch(html, /role="alert"/);
    assert.match(html, /border-border/);
  });

  it("mixed fixture counts match strip inputs", () => {
    const counts = countLoansDueUrgency(
      [
        { status: "active", nextDueDate: "2026-09-20" },
        { status: "active", nextDueDate: "2026-09-30" },
      ],
      "2026-09-27",
    );
    assert.deepEqual(counts, { overdue: 1, dueSoon: 1 });
  });
});
