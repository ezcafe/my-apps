import { buildQuery } from "@/lib/analytics-build-query";
import { defaultAnalyticsFilters } from "@/lib/analytics-default-filters";
import {
  defaultFiltersForLedgerPreset,
  mergeLedgerPresetQuery,
  resolveLedgerPresetCategoryIds,
  type MoneyLedgerPreset,
} from "@/lib/money-ledger-presets";

/** Current-month filter query — shared by overview SSR and client. */
export function moneyDefaultMonthFilterQuery(now: Date = new Date()): string {
  return buildQuery(defaultAnalyticsFilters(now));
}

/**
 * Ledger tab first-load filter query (preset locks + default month).
 * Must match {@link MoneyTransactionsPage} / {@link AnalyticsTransactionsTable} keys.
 */
export function moneyLedgerFirstLoadFilterQuery(
  preset: MoneyLedgerPreset,
  accounts: ReadonlyArray<{ id: string; type?: string | null }>,
  categories: ReadonlyArray<{
    id: string;
    name: string;
    parentId: string | null;
  }>,
  now: Date = new Date(),
): string {
  const applied = defaultFiltersForLedgerPreset(preset, accounts, categories);
  // defaultFiltersForLedgerPreset uses defaultAnalyticsFilters() without `now`;
  // override dates so SSR/client can share a frozen clock in tests.
  const withNow = defaultAnalyticsFilters(now);
  applied.fromDate = withNow.fromDate;
  applied.toDate = withNow.toDate;

  const categoryIds = resolveLedgerPresetCategoryIds(preset, categories);
  return mergeLedgerPresetQuery(
    buildQuery(applied),
    preset,
    categoryIds.length > 0 ? categoryIds : undefined,
  );
}

export function investmentDefaultChartRange(
  monthsBack: number,
  now: Date = new Date(),
): { from: string; to: string } {
  const to = new Date(now);
  const from = new Date(now);
  from.setMonth(from.getMonth() - monthsBack);
  return { from: localDateString(from), to: localDateString(to) };
}

function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
