import dynamic from "next/dynamic";
import { Alert } from "@/components/ui/alert";
import { KioskContextStrip } from "@/components/kiosk/kiosk-context-strip";
import { KioskLedgerSummaryCard } from "@/components/kiosk/kiosk-ledger-summary-card";
import { KioskLoansCard } from "@/components/kiosk/kiosk-loans-card";
import { KioskNetCard, KioskNetUnavailable } from "@/components/kiosk/kiosk-net-card";
import { KioskSectionHeading } from "@/components/kiosk/kiosk-section-heading";
import { kioskWidgetDefinition, type KioskWidgetId } from "@/lib/kiosk/widget-registry";
import type { KioskPageData } from "@/lib/kiosk/load-kiosk-page";
import { MONEY_DASHBOARD_STACK } from "@/lib/money-layout";
import { cn } from "@/lib/cn";

const LoansInsightsStats = dynamic(() =>
  import("@/components/loans-insights-stats").then((m) => ({
    default: m.LoansInsightsStats,
  })),
);

const InvestmentInsightsStats = dynamic(() =>
  import("@/components/investment-insights-stats").then((m) => ({
    default: m.InvestmentInsightsStats,
  })),
);

const METRIC_BAND_IDS = [
  "money.net_month",
  "bills.summary",
  "savings.summary",
] as const satisfies readonly KioskWidgetId[];

const INSIGHT_BAND_IDS = [
  "loans.summary",
  "investments.summary",
] as const satisfies readonly KioskWidgetId[];

function hasWidget(
  enabled: readonly KioskWidgetId[],
  id: KioskWidgetId,
): boolean {
  return enabled.includes(id);
}

export function KioskDashboard({ data }: { data: KioskPageData }) {
  const { enabledWidgets } = data;
  const showFinanceAlerts =
    enabledWidgets.some((id) => id !== "context.today_weather") &&
    (data.dbUnavailable || data.noWorkspace);

  const showWeather = hasWidget(enabledWidgets, "context.today_weather");
  const metricIds = METRIC_BAND_IDS.filter((id) => hasWidget(enabledWidgets, id));
  const insightIds = INSIGHT_BAND_IDS.filter((id) =>
    hasWidget(enabledWidgets, id),
  );
  const showLoansPayments = hasWidget(enabledWidgets, "loans.payments");
  const loansDef = kioskWidgetDefinition("loans.payments");

  return (
    <div className={cn(MONEY_DASHBOARD_STACK, "fx-fade-in fx-stagger-children")}>
      {showFinanceAlerts && data.dbUnavailable ? (
        <Alert
          variant="warning"
          title="Database temporarily unavailable"
          description="Finance widgets need PostgreSQL. Today's date and weather still work when configured."
        />
      ) : null}
      {showFinanceAlerts && data.noWorkspace ? (
        <Alert
          variant="warning"
          title="No Money workspace"
          description="Create or select a workspace in Settings to see finance widgets."
        />
      ) : null}

      {enabledWidgets.length === 0 ? (
        <div className="rounded-[var(--radius-sm)] border border-dashed border-border bg-background px-4 py-10 text-center">
          <p className="font-medium text-foreground">No kiosk widgets enabled</p>
          <p className="mt-1 text-sm text-muted">
            Choose widgets in{" "}
            <a
              href="/settings#settings-kiosk"
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              Settings → Kiosk
            </a>
            .
          </p>
        </div>
      ) : null}

      {showWeather ? (
        <section aria-label="Today and weather">
          <KioskContextStrip
            weather={data.weather}
            weatherCity={data.weatherCity}
          />
        </section>
      ) : null}

      {metricIds.length > 0 ? (
        <section
          aria-label="Money metrics"
          className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4"
        >
          {metricIds.map((widgetId) => {
            switch (widgetId) {
              case "money.net_month":
                return data.widgets.netMonth ? (
                  <KioskNetCard
                    key={widgetId}
                    net={data.widgets.netMonth}
                    currency={data.currency}
                  />
                ) : (
                  <KioskNetUnavailable key={widgetId} currency={data.currency} />
                );
              case "bills.summary":
                return data.widgets.billsSummary ? (
                  <KioskLedgerSummaryCard
                    key={widgetId}
                    title="Bills"
                    summary={data.widgets.billsSummary}
                    currency={data.currency}
                  />
                ) : (
                  <KioskNetUnavailable key={widgetId} currency={data.currency} />
                );
              case "savings.summary":
                return data.widgets.savingsSummary ? (
                  <KioskLedgerSummaryCard
                    key={widgetId}
                    title="Savings"
                    summary={data.widgets.savingsSummary}
                    currency={data.currency}
                  />
                ) : (
                  <KioskNetUnavailable key={widgetId} currency={data.currency} />
                );
              default:
                return null;
            }
          })}
        </section>
      ) : null}

      {insightIds.map((widgetId) => {
        switch (widgetId) {
          case "loans.summary":
            return (
              <section key={widgetId} aria-label="Loan summary">
                {data.widgets.loansSummary ? (
                  <LoansInsightsStats
                    atf={data.widgets.loansSummary}
                    currency={data.currency}
                    showPeriodCaption={false}
                    showActiveLoansCaption={false}
                    variant="page"
                  />
                ) : (
                  <KioskNetUnavailable currency={data.currency} />
                )}
              </section>
            );
          case "investments.summary":
            return (
              <section key={widgetId} aria-label="Investment summary">
                {data.widgets.investmentsSummary ? (
                  <InvestmentInsightsStats
                    atf={data.widgets.investmentsSummary}
                    currency={data.currency}
                    showPeriodCaption={false}
                    variant="page"
                  />
                ) : (
                  <KioskNetUnavailable currency={data.currency} />
                )}
              </section>
            );
          default:
            return null;
        }
      })}

      {showLoansPayments && loansDef ? (
        <section
          aria-labelledby="kiosk-loans-payments-heading"
          className="space-y-3"
        >
          <KioskSectionHeading
            id="kiosk-loans-payments-heading"
            title={loansDef.label}
            action={{ href: "/loans", label: "All loans" }}
          />
          <KioskLoansCard
            loans={data.widgets.loansPayments ?? { overdue: [], upcoming: [] }}
          />
        </section>
      ) : null}
    </div>
  );
}
