import {
  type MoneyCategoryKind,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import type { MoneyImportFkEntity } from "@/lib/money-import-kinds";

export type FkEntityRow = { id: string; name: string };

export type FkCategoryGroup = {
  kind: MoneyCategoryKind;
  rows: FkEntityRow[];
};

function isArchived(c: MoneyCategoryRow): boolean {
  return Boolean((c as MoneyCategoryRow & { archived?: boolean }).archived);
}

export function fkEntityRowsForField(
  fk: MoneyImportFkEntity,
  accounts: FkEntityRow[],
  merchants: FkEntityRow[],
): FkEntityRow[] {
  switch (fk) {
    case "account":
      return accounts.map((a) => ({ id: a.id, name: a.name }));
    case "merchant":
      return merchants.map((m) => ({ id: m.id, name: m.name }));
    default:
      return [];
  }
}

/**
 * Same as `fkEntityRowsForField` but transparently flattens category fks
 * (`category_root` / `category_leaf`) using {@link fkCategoryGroupsForField}.
 * Used for name-based auto-fill / satisfaction checks where the wizard doesn't
 * need the kind grouping.
 */
export function fkAllRowsForField(
  fk: MoneyImportFkEntity,
  accounts: FkEntityRow[],
  merchants: FkEntityRow[],
  categories: MoneyCategoryRow[],
): FkEntityRow[] {
  if (fk === "account" || fk === "merchant") {
    return fkEntityRowsForField(fk, accounts, merchants);
  }
  return fkCategoryGroupsForField(categories, fk).flatMap((g) => g.rows);
}

/**
 * For category-typed FK fields. Always returns two groups (expense +
 * income roots/leaves). The wizard renders these as `<optgroup>` sections.
 */
export function fkCategoryGroupsForField(
  categories: MoneyCategoryRow[],
  fk: Extract<MoneyImportFkEntity, "category_root" | "category_leaf">,
): FkCategoryGroup[] {
  const filtered = categories.filter((c) => {
    if (isArchived(c)) return false;
    if (fk === "category_root") return c.parentId == null;
    return c.parentId != null;
  });
  return [
    {
      kind: "expense",
      rows: filtered
        .filter((c) => c.kind === "expense")
        .map((c) => ({ id: c.id, name: c.name })),
    },
    {
      kind: "income",
      rows: filtered
        .filter((c) => c.kind === "income")
        .map((c) => ({ id: c.id, name: c.name })),
    },
  ];
}
