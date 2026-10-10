import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import {
  KioskNetCard,
  KioskNetUnavailable,
} from "@/components/kiosk/kiosk-net-card";
import { PreferencesProvider } from "@/components/preferences-provider";
import { ThemeProvider } from "@/components/theme-provider";

function renderNetCard() {
  return renderToStaticMarkup(
    createElement(
      ThemeProvider,
      null,
      createElement(
        PreferencesProvider,
        { initialDateFormat: "ymd" },
        createElement(KioskNetCard, {
          currency: "USD",
          net: {
            netMinor: 100_00,
            incomeMinor: 200_00,
            expenseMinor: 100_00,
            range: { from: "2026-10-01", to: "2026-10-31" },
          },
        }),
      ),
    ),
  );
}

describe("KioskNetUnavailable", () => {
  it("shows title Bills when passed (not Net)", () => {
    const html = renderToStaticMarkup(
      createElement(KioskNetUnavailable, {
        currency: "USD",
        title: "Bills",
      }),
    );
    assert.match(html, />Bills</);
    assert.doesNotMatch(html, />Net</);
  });
});

describe("KioskNetCard money colors", () => {
  it("uses chart income/expense colors, not --destructive for expenses", () => {
    const html = renderNetCard();
    const income = chartIncomeColor("light", "quiet");
    const expense = chartExpenseColor("light", "quiet");
    assert.match(html, new RegExp(`color:${income.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(html, new RegExp(`color:${expense.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.doesNotMatch(html, /--destructive/);
  });
});
