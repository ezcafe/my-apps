import { analyticsFiltersFromUrl } from "@/lib/money-transaction-analytics-conditions";
import { dateRangeParams } from "@/lib/analytics-build-query";
import { defaultAnalyticsFilters } from "@/lib/analytics-default-filters";
import {
  moneyLedgerFirstLoadFilterQuery,
  loansInsightsDefaultRange,
} from "@/lib/money-first-load-filters";
import {
  type MoneyLedgerPreset,
} from "@/lib/money-ledger-presets";
import {
  fetchMoneyLookups,
} from "@/lib/money-workspace-bootstrap-data";
import { analyticsFiltersSchema } from "@/lib/validators/money";

type LedgerLookupAccounts = ReadonlyArray<{ id: string; type?: string | null }>;
type LedgerLookupCategories = ReadonlyArray<{
  id: string;
  name: string;
  parentId: string | null;
}>;

/** Build ledger filters from already-fetched lookups (shared bills+savings path). */
export function analyticsFiltersForLedgerPresetFromLookups(
  preset: MoneyLedgerPreset,
  accounts: LedgerLookupAccounts,
  categories: LedgerLookupCategories,
) {
  const query = moneyLedgerFirstLoadFilterQuery(
    preset,
    accounts.map((a) => ({ id: a.id, type: a.type })),
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      parentId: c.parentId,
    })),
  );
  const parsed = analyticsFiltersFromUrl(new URL(`http://local/?${query}`));
  if (!parsed.success) {
    throw new Error(`Invalid ${preset.title} kiosk filters`);
  }
  return parsed.data;
}

export async function analyticsFiltersForLedgerPreset(
  workspaceId: string,
  preset: MoneyLedgerPreset,
  currency = "USD",
) {
  const { accounts, categories } = await fetchMoneyLookups(workspaceId, currency);
  return analyticsFiltersForLedgerPresetFromLookups(
    preset,
    accounts,
    categories,
  );
}

export function currentMonthAnalyticsFilters() {
  const uiFilters = defaultAnalyticsFilters();
  const { from, to } = dateRangeParams(uiFilters.fromDate, uiFilters.toDate);
  return analyticsFiltersSchema.parse({ from, to });
}

export function currentMonthDateRange() {
  return loansInsightsDefaultRange();
}
