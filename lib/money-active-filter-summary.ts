import type { AnalyticsFiltersValue } from "@/lib/analytics-default-filters";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";
import { moneyCategoryById, moneyCategoryLabel } from "@/lib/money-category-ui";

export type ActiveFilterLookupItem = { id: string; name: string };

export type ActiveFilterLookups = {
  accounts?: readonly ActiveFilterLookupItem[];
  categories?: readonly MoneyCategoryRow[];
  merchants?: readonly ActiveFilterLookupItem[];
  tags?: readonly ActiveFilterLookupItem[];
  recurrenceTemplates?: readonly ActiveFilterLookupItem[];
  viewScopeLabel?: string;
};

/**
 * Extracts human-readable labels for active/applied filters to display
 * alongside the period range (e.g. `Showing 1 Aug – 31 Aug · Spending · Groceries`).
 */
export function resolveActiveFilterLabels(
  filters: AnalyticsFiltersValue,
  lookups: ActiveFilterLookups = {},
): string[] {
  const labels: string[] = [];

  if (lookups.viewScopeLabel) {
    labels.push(lookups.viewScopeLabel);
  }

  // 1. Direction (kinds)
  if (filters.kinds.length === 1) {
    const k = filters.kinds[0];
    if (k === "expense") labels.push("Spending");
    else if (k === "income") labels.push("Income");
    else if (k === "transfer") labels.push("Transfers");
  } else if (filters.kinds.length === 2) {
    const kindNames = filters.kinds.map((k) =>
      k === "expense" ? "Spending" : k === "income" ? "Income" : "Transfers",
    );
    labels.push(kindNames.join(" & "));
  }

  // 2. Accounts
  if (filters.accountIds.length === 1) {
    const acc = lookups.accounts?.find((a) => a.id === filters.accountIds[0]);
    labels.push(acc ? acc.name : "1 account");
  } else if (filters.accountIds.length > 1) {
    labels.push(`${filters.accountIds.length} accounts`);
  }

  // 3. Categories
  if (filters.categoryIds.length === 1) {
    const cats = (lookups.categories ?? []) as MoneyCategoryRow[];
    const byId = moneyCategoryById(cats);
    const cat = byId.get(filters.categoryIds[0]);
    labels.push(cat ? moneyCategoryLabel(cat, byId) : "1 category");
  } else if (filters.categoryIds.length > 1) {
    labels.push(`${filters.categoryIds.length} categories`);
  }

  // 4. Merchants
  if (filters.merchantIds.length === 1) {
    const m = lookups.merchants?.find((item) => item.id === filters.merchantIds[0]);
    labels.push(m ? m.name : "1 merchant");
  } else if (filters.merchantIds.length > 1) {
    labels.push(`${filters.merchantIds.length} merchants`);
  }

  // 5. Tags
  if (filters.tagIds.length === 1) {
    const t = lookups.tags?.find((item) => item.id === filters.tagIds[0]);
    labels.push(t ? `#${t.name}` : "1 tag");
  } else if (filters.tagIds.length > 1) {
    labels.push(`${filters.tagIds.length} tags`);
  }

  // 6. Recurrence
  if (filters.recurrence === "recurring") {
    if (filters.recurrenceSourceIds.length === 1) {
      const r = lookups.recurrenceTemplates?.find(
        (item) => item.id === filters.recurrenceSourceIds[0],
      );
      labels.push(r ? `Recurring: ${r.name}` : "Recurring");
    } else if (filters.recurrenceSourceIds.length > 1) {
      labels.push(`Recurring (${filters.recurrenceSourceIds.length})`);
    } else {
      labels.push("Recurring");
    }
  } else if (filters.recurrence === "one-time") {
    labels.push("One-time");
  }

  return labels;
}
