import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KioskDashboard } from "@/components/kiosk/kiosk-dashboard";
import { NotificationProvider } from "@/components/notification-provider";
import { PreferencesProvider } from "@/components/preferences-provider";
import { ThemeProvider } from "@/components/theme-provider";
import type { KioskPageData } from "@/lib/kiosk/load-kiosk-page";
import type { KioskWidgetId } from "@/lib/kiosk/widget-registry";

function baseData(
  overrides: Partial<KioskPageData> & {
    enabledWidgets?: readonly KioskWidgetId[];
  } = {},
): KioskPageData {
  const enabledWidgets = [...(overrides.enabledWidgets ?? [
    "context.today_weather",
    "money.net_month",
    "loans.payments",
  ])] as KioskWidgetId[];
  return {
    enabledWidgets,
    currency: "USD",
    weather: null,
    weatherCity: null,
    widgets: {
      netMonth: {
        netMinor: 100,
        incomeMinor: 200,
        expenseMinor: 100,
        range: { from: "2026-10-01", to: "2026-10-31" },
      },
      loansPayments: { overdue: [], upcoming: [] },
      ...overrides.widgets,
    },
    dbUnavailable: false,
    noWorkspace: false,
    ...overrides,
    enabledWidgets,
  };
}

function renderDashboard(data: KioskPageData) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderToStaticMarkup(
    createElement(
      ThemeProvider,
      null,
      createElement(
        PreferencesProvider,
        { initialDateFormat: "ymd" },
        createElement(
          NotificationProvider,
          null,
          createElement(
            QueryClientProvider,
            { client },
            createElement(KioskDashboard, { data }),
          ),
        ),
      ),
    ),
  );
}

function indexOf(html: string, needle: string): number {
  const i = html.indexOf(needle);
  assert.ok(i >= 0, `expected to find ${JSON.stringify(needle)}`);
  return i;
}

// E2E glance order skipped: no /kiosk Playwright suite yet; DOM-index units cover strip → attention → metrics.
describe("KioskDashboard attention-first order", () => {
  it("orders strip → payments attention → money metrics (defaults)", () => {
    const html = renderDashboard(
      baseData({
        widgets: {
          netMonth: {
            netMinor: 100,
            incomeMinor: 200,
            expenseMinor: 100,
            range: { from: "2026-10-01", to: "2026-10-31" },
          },
          loansPayments: {
            overdue: [],
            upcoming: [
              {
                id: "loan-1",
                name: "Car loan",
                nextDueDate: "2026-10-20",
                paymentMinor: 50_00,
                currency: "USD",
              },
            ],
          },
        },
      }),
    );
    const strip = indexOf(html, 'aria-label="Today and weather"');
    const payments = indexOf(html, "Loan payments due");
    const metrics = indexOf(html, 'aria-label="Money metrics"');
    assert.ok(strip < payments && payments < metrics);
  });

  it("keeps Net as first metric when bills and savings are also on", () => {
    const html = renderDashboard(
      baseData({
        enabledWidgets: [
          "money.net_month",
          "bills.summary",
          "savings.summary",
        ],
        widgets: {
          netMonth: {
            netMinor: 1,
            incomeMinor: 2,
            expenseMinor: 1,
            range: { from: "2026-10-01", to: "2026-10-31" },
          },
          billsSummary: {
            netMinor: -10,
            incomeMinor: 0,
            expenseMinor: 10,
            range: { from: "2026-10-01", to: "2026-10-31" },
          },
          savingsSummary: {
            netMinor: 5,
            incomeMinor: 5,
            expenseMinor: 0,
            range: { from: "2026-10-01", to: "2026-10-31" },
          },
        },
      }),
    );
    const metricsStart = indexOf(html, 'aria-label="Money metrics"');
    const metricsHtml = html.slice(metricsStart);
    const net = metricsHtml.indexOf(">Net<");
    const bills = metricsHtml.indexOf(">Bills<");
    const savings = metricsHtml.indexOf(">Savings<");
    assert.ok(net >= 0 && bills > net && savings > bills);
  });

  it("places overdue Alert in payments band before metrics", () => {
    const html = renderDashboard(
      baseData({
        widgets: {
          netMonth: {
            netMinor: 100,
            incomeMinor: 200,
            expenseMinor: 100,
            range: { from: "2026-10-01", to: "2026-10-31" },
          },
          loansPayments: {
            overdue: [
              {
                scheduleInstallmentId: "si-1",
                loanId: "loan-1",
                loanName: "Car loan",
                installmentNumber: 3,
                dueDate: "2026-09-01",
                paymentMinor: 50_00,
                currency: "USD",
                moneyAccountId: null,
                moneyCategoryId: null,
              },
            ],
            upcoming: [],
          },
        },
      }),
    );
    const alert = indexOf(html, "1 payment overdue");
    const metrics = indexOf(html, 'aria-label="Money metrics"');
    assert.ok(alert < metrics);
  });

  it("places Money metrics before Loan and Investment summary when insights are on", () => {
    const html = renderDashboard(
      baseData({
        enabledWidgets: [
          "money.net_month",
          "loans.payments",
          "loans.summary",
          "investments.summary",
        ],
        widgets: {
          netMonth: {
            netMinor: 100,
            incomeMinor: 200,
            expenseMinor: 100,
            range: { from: "2026-10-01", to: "2026-10-31" },
          },
          loansPayments: { overdue: [], upcoming: [] },
        },
      }),
    );
    const metrics = indexOf(html, 'aria-label="Money metrics"');
    const loanSummary = indexOf(html, 'aria-label="Loan summary"');
    const investmentSummary = indexOf(
      html,
      'aria-label="Investment summary"',
    );
    assert.ok(
      metrics < loanSummary && loanSummary < investmentSummary,
      "Money metrics must precede Loan summary and Investment summary",
    );
  });
});

describe("KioskDashboard unavailable metric titles", () => {
  it("shows Unavailable titled Bills when bills.summary is on without billsSummary", () => {
    const html = renderDashboard(
      baseData({
        enabledWidgets: ["bills.summary"],
        widgets: {},
      }),
    );
    const metricsStart = indexOf(html, 'aria-label="Money metrics"');
    const metricsHtml = html.slice(metricsStart);
    const billsTitle = metricsHtml.indexOf(">Bills<");
    assert.ok(billsTitle >= 0, "expected Bills title in Money metrics");
    assert.ok(
      metricsHtml.includes("Unavailable"),
      "expected Unavailable fallback in Money metrics",
    );
    assert.equal(
      metricsHtml.includes(">Net<"),
      false,
      "unavailable Bills must not fall back to default Net title",
    );
  });

  it("shows Unavailable titled Savings when savings.summary is on without savingsSummary", () => {
    const html = renderDashboard(
      baseData({
        enabledWidgets: ["savings.summary"],
        widgets: {},
      }),
    );
    const metricsStart = indexOf(html, 'aria-label="Money metrics"');
    const metricsHtml = html.slice(metricsStart);
    assert.ok(metricsHtml.indexOf(">Savings<") >= 0);
    assert.ok(metricsHtml.includes("Unavailable"));
    assert.equal(metricsHtml.includes(">Net<"), false);
  });
});

describe("KioskDashboard empty and attention guards", () => {
  it("uses AnalyticsEmptyState when no widgets enabled", () => {
    const html = renderDashboard(baseData({ enabledWidgets: [] }));
    assert.match(html, /role="status"/);
    assert.match(html, /No kiosk widgets enabled/);
    assert.match(html, /settings#settings-kiosk/);
    assert.doesNotMatch(html, /border-dashed border-border bg-background px-4 py-10/);
  });

  it("omits payments section when loans.payments is off", () => {
    const html = renderDashboard(
      baseData({
        enabledWidgets: ["money.net_month", "bills.summary"],
        widgets: {
          netMonth: {
            netMinor: 1,
            incomeMinor: 2,
            expenseMinor: 1,
            range: { from: "2026-10-01", to: "2026-10-31" },
          },
          billsSummary: {
            netMinor: -10,
            incomeMinor: 0,
            expenseMinor: 10,
            range: { from: "2026-10-01", to: "2026-10-31" },
          },
        },
      }),
    );
    assert.doesNotMatch(html, /Loan payments due/);
    assert.doesNotMatch(html, /payment overdue/);
    assert.match(html, />Bills</);
    assert.match(html, /aria-label="Money metrics"/);
  });

  it("shows soft AnalyticsEmptyState and no urgency Alert when payments empty", () => {
    const html = renderDashboard(
      baseData({
        widgets: {
          netMonth: {
            netMinor: 1,
            incomeMinor: 2,
            expenseMinor: 1,
            range: { from: "2026-10-01", to: "2026-10-31" },
          },
          loansPayments: { overdue: [], upcoming: [] },
        },
      }),
    );
    assert.match(html, /Loan payments due/);
    assert.match(html, /No upcoming payments/);
    assert.match(html, /role="status"/);
    assert.doesNotMatch(html, /payment overdue/);
  });
});

describe("KioskDashboard Phase 2 stub (deferred)", () => {
  it.skip("attention shows bills-due rows only when widgets.billsDue present", () => {
    // Phase 2: honest bills-due loader — not implemented in this Build.
  });

  it("enabling bills.summary alone does not create attention bills-due", () => {
    const html = renderDashboard(
      baseData({
        enabledWidgets: ["bills.summary"],
        widgets: {
          billsSummary: {
            netMinor: -10,
            incomeMinor: 0,
            expenseMinor: 10,
            range: { from: "2026-10-01", to: "2026-10-31" },
          },
        },
      }),
    );
    assert.doesNotMatch(html, /Loan payments due/);
    assert.doesNotMatch(html, /bills-due|Bills due|payment overdue/i);
    assert.match(html, />Bills</);
    assert.match(html, /aria-label="Money metrics"/);
  });
});
