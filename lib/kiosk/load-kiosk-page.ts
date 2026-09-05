import { runInWorkspace } from "@/db";
import { isDbUnreachable } from "@/lib/db-errors";
import type { DueInstallmentRow } from "@/lib/loans-services/due";
import {
  listDueInstallments,
  listUpcomingLoanPayments,
  type UpcomingLoanPaymentRow,
} from "@/lib/loans-services/due";
import {
  loansInsightsSummary,
  type LoansInsightsSummaryPayload,
} from "@/lib/loans-services/loans";
import {
  investmentInsightsSummary,
  type InvestmentInsightsSummaryPayload,
} from "@/lib/investment-services/portfolio-series";
import {
  analyticsFiltersForLedgerPresetFromLookups,
  currentMonthAnalyticsFilters,
  currentMonthDateRange,
} from "@/lib/kiosk/kiosk-analytics-filters";
import {
  resolveKioskWidgets,
  type KioskWidgetId,
} from "@/lib/kiosk/widget-registry";
import { MONEY_LEDGER_BILLS, MONEY_LEDGER_SAVINGS } from "@/lib/money-ledger-presets";
import { computeMoneyAnalyticsSummary } from "@/lib/money-services/analytics";
import { fetchMoneyLookups } from "@/lib/money-workspace-bootstrap-data";
import { getUserPreferences } from "@/lib/user-preferences-service";
import {
  fetchCurrentWeather,
  type WeatherSnapshot,
} from "@/lib/weather/open-meteo";
import { getWorkspaceDefaultCurrency, getWorkspaceIdForUser } from "@/lib/workspace";

export type KioskNetWidget = {
  netMinor: number;
  incomeMinor: number;
  expenseMinor: number;
  range: { from: string; to: string };
};

export type KioskLedgerSummaryWidget = {
  netMinor: number;
  incomeMinor: number;
  expenseMinor: number;
  range: { from: string; to: string };
};

export type KioskLoansPaymentsWidget = {
  overdue: DueInstallmentRow[];
  upcoming: UpcomingLoanPaymentRow[];
};

export type KioskPageData = {
  enabledWidgets: KioskWidgetId[];
  currency: string;
  weather: WeatherSnapshot | null;
  weatherCity: string | null;
  widgets: {
    netMonth?: KioskNetWidget;
    loansPayments?: KioskLoansPaymentsWidget;
    loansSummary?: LoansInsightsSummaryPayload;
    investmentsSummary?: InvestmentInsightsSummaryPayload;
    billsSummary?: KioskLedgerSummaryWidget;
    savingsSummary?: KioskLedgerSummaryWidget;
  };
  dbUnavailable: boolean;
  noWorkspace: boolean;
};

function needsFinanceWidgets(enabled: KioskWidgetId[]): boolean {
  return enabled.some((id) => id !== "context.today_weather");
}

async function loadWeatherSnapshot(
  prefs: Awaited<ReturnType<typeof getUserPreferences>>,
  showWeather: boolean,
): Promise<WeatherSnapshot | null> {
  if (
    !showWeather ||
    prefs.weatherLatitude == null ||
    prefs.weatherLongitude == null ||
    !prefs.weatherCity
  ) {
    return null;
  }
  try {
    return await fetchCurrentWeather(
      prefs.weatherLatitude,
      prefs.weatherLongitude,
      prefs.weatherCity,
    );
  } catch {
    return null;
  }
}

function ledgerSummaryFromAnalytics(summary: {
  stats: { netMinor: number; incomeMinor: number; expenseMinor: number };
  range: { from: string; to: string };
}): KioskLedgerSummaryWidget {
  return {
    netMinor: summary.stats.netMinor,
    incomeMinor: summary.stats.incomeMinor,
    expenseMinor: summary.stats.expenseMinor,
    range: summary.range,
  };
}

export async function loadKioskPageData(
  userSub: string,
  kioskWidgets?: readonly KioskWidgetId[] | null,
): Promise<KioskPageData> {
  const fallbackEmpty = (): KioskPageData => ({
    enabledWidgets: resolveKioskWidgets(kioskWidgets),
    currency: "USD",
    weather: null,
    weatherCity: null,
    widgets: {},
    dbUnavailable: false,
    noWorkspace: false,
  });

  let prefs;
  try {
    prefs = await getUserPreferences(userSub);
  } catch (e) {
    if (isDbUnreachable(e)) {
      return { ...fallbackEmpty(), dbUnavailable: true };
    }
    throw e;
  }

  const enabledWidgets = resolveKioskWidgets(kioskWidgets ?? prefs.kioskWidgets);
  const empty: KioskPageData = {
    enabledWidgets,
    currency: "USD",
    weather: null,
    weatherCity: null,
    widgets: {},
    dbUnavailable: false,
    noWorkspace: false,
  };

  const showWeather = enabledWidgets.includes("context.today_weather");
  // Start weather immediately so it overlaps workspace resolution when both run.
  const weatherPromise = loadWeatherSnapshot(prefs, showWeather);

  if (!needsFinanceWidgets(enabledWidgets)) {
    return {
      ...empty,
      weather: await weatherPromise,
      weatherCity: prefs.weatherCity,
    };
  }

  let workspaceId: string | null;
  try {
    workspaceId = await getWorkspaceIdForUser(userSub);
  } catch (e) {
    if (isDbUnreachable(e)) {
      return {
        ...empty,
        weather: await weatherPromise,
        weatherCity: prefs.weatherCity,
        dbUnavailable: true,
      };
    }
    throw e;
  }

  const weather = await weatherPromise;

  if (!workspaceId) {
    return {
      ...empty,
      weather,
      weatherCity: prefs.weatherCity,
      noWorkspace: true,
    };
  }

  try {
    const ctx = { userSub, workspaceId };
    const range = currentMonthDateRange();
    const monthFilters = currentMonthAnalyticsFilters();
    const wantBills = enabledWidgets.includes("bills.summary");
    const wantSavings = enabledWidgets.includes("savings.summary");

    const data = await runInWorkspace(workspaceId, async () => {
      const widgets: KioskPageData["widgets"] = {};
      // Currency starts in parallel with widgets that do not need it.
      const currencyPromise = getWorkspaceDefaultCurrency(workspaceId!).then(
        (c) => c ?? "USD",
      );

      const tasks: Promise<void>[] = [];

      if (enabledWidgets.includes("money.net_month")) {
        tasks.push(
          computeMoneyAnalyticsSummary(workspaceId!, monthFilters).then(
            (summary) => {
              widgets.netMonth = ledgerSummaryFromAnalytics(summary);
            },
          ),
        );
      }

      if (enabledWidgets.includes("loans.payments")) {
        tasks.push(
          Promise.all([
            listDueInstallments(workspaceId!),
            listUpcomingLoanPayments(workspaceId!, 5),
          ]).then(([overdue, upcoming]) => {
            widgets.loansPayments = { overdue, upcoming };
          }),
        );
      }

      if (enabledWidgets.includes("loans.summary")) {
        tasks.push(
          loansInsightsSummary(ctx, range.from, range.to).then((summary) => {
            widgets.loansSummary = summary;
          }),
        );
      }

      if (enabledWidgets.includes("investments.summary")) {
        tasks.push(
          investmentInsightsSummary(workspaceId!, range.from, range.to).then(
            (summary) => {
              widgets.investmentsSummary = summary;
            },
          ),
        );
      }

      if (wantBills || wantSavings) {
        tasks.push(
          (async () => {
            const currency = await currencyPromise;
            const { accounts, categories } = await fetchMoneyLookups(
              workspaceId!,
              currency,
            );
            const ledgerTasks: Promise<void>[] = [];
            if (wantBills) {
              const filters = analyticsFiltersForLedgerPresetFromLookups(
                MONEY_LEDGER_BILLS,
                accounts,
                categories,
              );
              ledgerTasks.push(
                computeMoneyAnalyticsSummary(workspaceId!, filters).then(
                  (summary) => {
                    widgets.billsSummary = ledgerSummaryFromAnalytics(summary);
                  },
                ),
              );
            }
            if (wantSavings) {
              const filters = analyticsFiltersForLedgerPresetFromLookups(
                MONEY_LEDGER_SAVINGS,
                accounts,
                categories,
              );
              ledgerTasks.push(
                computeMoneyAnalyticsSummary(workspaceId!, filters).then(
                  (summary) => {
                    widgets.savingsSummary = ledgerSummaryFromAnalytics(summary);
                  },
                ),
              );
            }
            await Promise.all(ledgerTasks);
          })(),
        );
      }

      const [, currency] = await Promise.all([
        Promise.all(tasks),
        currencyPromise,
      ]);
      return { currency, widgets };
    });

    return {
      enabledWidgets,
      currency: data.currency,
      weather,
      weatherCity: prefs.weatherCity,
      widgets: data.widgets,
      dbUnavailable: false,
      noWorkspace: false,
    };
  } catch (e) {
    if (isDbUnreachable(e)) {
      return {
        ...empty,
        weather,
        weatherCity: prefs.weatherCity,
        dbUnavailable: true,
      };
    }
    throw e;
  }
}
