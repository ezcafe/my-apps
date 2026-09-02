import { runInWorkspace } from "@/db";
import { isDbUnreachable } from "@/lib/db-errors";
import { dateRangeParams } from "@/lib/analytics-build-query";
import { defaultAnalyticsFilters } from "@/lib/analytics-default-filters";
import { listDueInstallments, type DueInstallmentRow } from "@/lib/loans-services/due";
import {
  listLoans,
  type SerializedLoanListItem,
} from "@/lib/loans-services/loans";
import { computeMoneyAnalyticsSummary } from "@/lib/money-services/analytics";
import { getUserPreferences } from "@/lib/user-preferences-service";
import { analyticsFiltersSchema } from "@/lib/validators/money";
import {
  fetchCurrentWeather,
  type WeatherSnapshot,
} from "@/lib/weather/open-meteo";
import { getWorkspaceDefaultCurrency, getWorkspaceIdForUser } from "@/lib/workspace";

export type HomePageData = {
  currency: string;
  net: {
    netMinor: number;
    incomeMinor: number;
    expenseMinor: number;
    range: { from: string; to: string };
  } | null;
  loans: {
    overdue: DueInstallmentRow[];
    upcoming: SerializedLoanListItem[];
  };
  weather: WeatherSnapshot | null;
  weatherCity: string | null;
  dbUnavailable: boolean;
  noWorkspace: boolean;
};

function sortUpcomingLoans(
  loans: SerializedLoanListItem[],
): SerializedLoanListItem[] {
  return loans
    .filter((loan) => loan.status === "active" && loan.nextDueDate)
    .sort((a, b) => {
      const ad = a.nextDueDate ?? "";
      const bd = b.nextDueDate ?? "";
      return ad.localeCompare(bd);
    })
    .slice(0, 5);
}

export async function loadHomePageData(userSub: string): Promise<HomePageData> {
  const empty: HomePageData = {
    currency: "USD",
    net: null,
    loans: { overdue: [], upcoming: [] },
    weather: null,
    weatherCity: null,
    dbUnavailable: false,
    noWorkspace: false,
  };

  let prefs;
  try {
    prefs = await getUserPreferences(userSub);
  } catch (e) {
    if (isDbUnreachable(e)) {
      return { ...empty, dbUnavailable: true };
    }
    throw e;
  }

  let workspaceId: string | null;
  try {
    workspaceId = await getWorkspaceIdForUser(userSub);
  } catch (e) {
    if (isDbUnreachable(e)) {
      return { ...empty, dbUnavailable: true, weatherCity: prefs.weatherCity };
    }
    throw e;
  }

  if (!workspaceId) {
    return {
      ...empty,
      weatherCity: prefs.weatherCity,
      noWorkspace: true,
    };
  }

  let weather: WeatherSnapshot | null = null;
  if (
    prefs.weatherLatitude != null &&
    prefs.weatherLongitude != null &&
    prefs.weatherCity
  ) {
    weather = await fetchCurrentWeather(
      prefs.weatherLatitude,
      prefs.weatherLongitude,
      prefs.weatherCity,
    );
  }

  try {
    const uiFilters = defaultAnalyticsFilters();
    const { from, to } = dateRangeParams(uiFilters.fromDate, uiFilters.toDate);
    const filters = analyticsFiltersSchema.parse({ from, to });
    const ctx = { userSub, workspaceId };

    const [currency, netSummary, overdue, loanRows] = await runInWorkspace(
      workspaceId,
      async () =>
        Promise.all([
          getWorkspaceDefaultCurrency(workspaceId!),
          computeMoneyAnalyticsSummary(workspaceId!, filters),
          listDueInstallments(workspaceId!),
          listLoans(ctx),
        ]),
    );

    return {
      currency: currency ?? "USD",
      net: {
        netMinor: netSummary.stats.netMinor,
        incomeMinor: netSummary.stats.incomeMinor,
        expenseMinor: netSummary.stats.expenseMinor,
        range: netSummary.range,
      },
      loans: {
        overdue,
        upcoming: sortUpcomingLoans(loanRows),
      },
      weather,
      weatherCity: prefs.weatherCity,
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
