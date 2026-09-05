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

const KIND_LABEL: Record<string, string> = {
  expense: "Spending",
  income: "Income",
  transfer: "Transfers",
};

function countOrSingleLabel(
  ids: readonly string[],
  singularFallback: string,
  pluralNoun: string,
  resolveOne: (id: string) => string | undefined,
): string | null {
  if (ids.length === 1) {
    return resolveOne(ids[0]!) ?? singularFallback;
  }
  if (ids.length > 1) {
    return `${ids.length} ${pluralNoun}`;
  }
  return null;
}

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

  if (filters.kinds.length === 1) {
    const label = KIND_LABEL[filters.kinds[0]!];
    if (label) labels.push(label);
  } else if (filters.kinds.length === 2) {
    labels.push(
      filters.kinds.map((k) => KIND_LABEL[k] ?? k).join(" & "),
    );
  }

  const accountLabel = countOrSingleLabel(
    filters.accountIds,
    "1 account",
    "accounts",
    (id) => lookups.accounts?.find((a) => a.id === id)?.name,
  );
  if (accountLabel) labels.push(accountLabel);

  const categoryLabel = countOrSingleLabel(
    filters.categoryIds,
    "1 category",
    "categories",
    (id) => {
      const cats = (lookups.categories ?? []) as MoneyCategoryRow[];
      const byId = moneyCategoryById(cats);
      const cat = byId.get(id);
      return cat ? moneyCategoryLabel(cat, byId) : undefined;
    },
  );
  if (categoryLabel) labels.push(categoryLabel);

  const merchantLabel = countOrSingleLabel(
    filters.merchantIds,
    "1 merchant",
    "merchants",
    (id) => lookups.merchants?.find((item) => item.id === id)?.name,
  );
  if (merchantLabel) labels.push(merchantLabel);

  const tagLabel = countOrSingleLabel(
    filters.tagIds,
    "1 tag",
    "tags",
    (id) => {
      const name = lookups.tags?.find((item) => item.id === id)?.name;
      return name ? `#${name}` : undefined;
    },
  );
  if (tagLabel) labels.push(tagLabel);

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
