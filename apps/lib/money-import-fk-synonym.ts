import type { MoneyCategoryRow } from "@/lib/money-category-ui";
import type { MoneyImportFkEntity } from "@/lib/money-import-kinds";

export type FkEntityRow = { id: string; name: string };

function isArchived(c: MoneyCategoryRow): boolean {
  return Boolean((c as MoneyCategoryRow & { archived?: boolean }).archived);
}

export function fkEntityRowsForField(
  fk: MoneyImportFkEntity,
  accounts: FkEntityRow[],
  merchants: FkEntityRow[],
  categories: MoneyCategoryRow[],
): FkEntityRow[] {
  switch (fk) {
    case "account":
      return accounts.map((a) => ({ id: a.id, name: a.name }));
    case "merchant":
      return merchants.map((m) => ({ id: m.id, name: m.name }));
    case "category_root":
      return categories
        .filter((c) => c.parentId == null && !isArchived(c))
        .map((c) => ({ id: c.id, name: c.name }));
    case "category_leaf":
      return categories
        .filter((c) => c.parentId != null && !isArchived(c))
        .map((c) => ({ id: c.id, name: c.name }));
    default:
      return [];
  }
}
