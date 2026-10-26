/** Old export UUIDs → new workspace UUIDs after import (reset round-trip). */
export type MoneyImportIdMaps = {
  accounts: Map<string, string>;
  categories: Map<string, string>;
  merchants: Map<string, string>;
  tags: Map<string, string>;
};

export function createEmptyMoneyImportIdMaps(): MoneyImportIdMaps {
  return {
    accounts: new Map(),
    categories: new Map(),
    merchants: new Map(),
    tags: new Map(),
  };
}

export function remapImportedId(
  map: Map<string, string>,
  id: string | null | undefined,
): string | null | undefined {
  if (id == null || id === "") return id;
  return map.get(id) ?? id;
}

export function remapImportedIdRequired(
  map: Map<string, string>,
  id: string,
): string {
  return map.get(id) ?? id;
}

/** Remap UUID fields on flat ZIP CSV rows before kind-specific mapping. */
export function remapFlatMoneyImportRows(
  kind: string,
  rows: Record<string, string>[],
  maps: MoneyImportIdMaps,
): Record<string, string>[] {
  return rows.map((row) => {
    const next = { ...row };
    switch (kind) {
      case "budgets": {
        if (next.scopeId) {
          const st = (next.scopeType ?? "").toLowerCase();
          if (st === "account") {
            next.scopeId = remapImportedIdRequired(maps.accounts, next.scopeId);
          } else if (st === "category") {
            next.scopeId = remapImportedIdRequired(
              maps.categories,
              next.scopeId,
            );
          } else if (st === "tag") {
            next.scopeId = remapImportedIdRequired(maps.tags, next.scopeId);
          }
        }
        break;
      }
      case "transactions": {
        if (next.accountId) {
          next.accountId = remapImportedIdRequired(
            maps.accounts,
            next.accountId,
          );
        }
        if (next.categoryId) {
          next.categoryId = remapImportedIdRequired(
            maps.categories,
            next.categoryId,
          );
        }
        if (next.merchantId) {
          next.merchantId = remapImportedIdRequired(
            maps.merchants,
            next.merchantId,
          );
        }
        if (next.tagIds) {
          next.tagIds = next.tagIds
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((id) => remapImportedIdRequired(maps.tags, id))
            .join(",");
        }
        break;
      }
      case "rules": {
        if (next.matchAccountId) {
          next.matchAccountId = remapImportedIdRequired(
            maps.accounts,
            next.matchAccountId,
          );
        }
        if (next.matchMerchantId) {
          next.matchMerchantId = remapImportedIdRequired(
            maps.merchants,
            next.matchMerchantId,
          );
        }
        if (next.setCategoryId) {
          next.setCategoryId = remapImportedIdRequired(
            maps.categories,
            next.setCategoryId,
          );
        }
        if (next.actionSetCategoryId) {
          next.actionSetCategoryId = remapImportedIdRequired(
            maps.categories,
            next.actionSetCategoryId,
          );
        }
        if (next.tagIds) {
          next.tagIds = next.tagIds
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((id) => remapImportedIdRequired(maps.tags, id))
            .join(",");
        }
        if (next.actionTagIds) {
          next.actionTagIds = next.actionTagIds
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((id) => remapImportedIdRequired(maps.tags, id))
            .join(",");
        }
        break;
      }
      case "recurrence": {
        if (next.templateAccountId) {
          next.templateAccountId = remapImportedIdRequired(
            maps.accounts,
            next.templateAccountId,
          );
        }
        if (next.templateCategoryId) {
          next.templateCategoryId = remapImportedIdRequired(
            maps.categories,
            next.templateCategoryId,
          );
        }
        if (next.templateMerchantId) {
          next.templateMerchantId = remapImportedIdRequired(
            maps.merchants,
            next.templateMerchantId,
          );
        }
        if (next.templateTagIds) {
          next.templateTagIds = next.templateTagIds
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((id) => remapImportedIdRequired(maps.tags, id))
            .join(",");
        }
        break;
      }
      default:
        break;
    }
    return next;
  });
}
