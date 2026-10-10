import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import { KioskLedgerSummaryCard } from "@/components/kiosk/kiosk-ledger-summary-card";
import { PreferencesProvider } from "@/components/preferences-provider";
import { ThemeProvider } from "@/components/theme-provider";

describe("KioskLedgerSummaryCard money colors", () => {
  it("uses chart income/expense colors, not --destructive for expenses", () => {
    const html = renderToStaticMarkup(
      createElement(
        ThemeProvider,
        null,
        createElement(
          PreferencesProvider,
          { initialDateFormat: "ymd" },
          createElement(KioskLedgerSummaryCard, {
            title: "Bills",
            currency: "USD",
            summary: {
              netMinor: -50_00,
              incomeMinor: 0,
              expenseMinor: 50_00,
              range: { from: "2026-10-01", to: "2026-10-31" },
            },
          }),
        ),
      ),
    );
    const income = chartIncomeColor("light", "quiet");
    const expense = chartExpenseColor("light", "quiet");
    assert.match(html, new RegExp(`color:${income.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(html, new RegExp(`color:${expense.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.doesNotMatch(html, /--destructive/);
  });
});
