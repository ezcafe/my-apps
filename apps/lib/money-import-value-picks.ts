import type { MoneyCategoryRow } from "@/lib/money-category-ui";
import type { FkEntityRow } from "@/lib/money-import-fk-synonym";
import { fkEntityRowsForField } from "@/lib/money-import-fk-synonym";
import {
  MONEY_IMPORT_ACCOUNT_TYPES,
  moneyImportFieldDefs,
  type MoneyImportFieldDef,
  type MoneyImportKind,
} from "@/lib/money-import-kinds";
import {
  defaultEnumCanonical,
  listDistinctForMoneyImportField,
  VALUE_MAP_DISTINCT_LIMIT,
  VALUE_MAP_IGNORE,
} from "@/lib/money-import-value-map";
import {
  parseBoolCell,
  resolveLeafCategoryId,
  resolveRootCategoryId,
  resolveUniqueByName,
} from "@/lib/money-import-resolve";

export type MoneyImportAccountType = (typeof MONEY_IMPORT_ACCOUNT_TYPES)[number];

export type MoneyImportValuePick =
  | { kind: "entity"; entityId: string }
  | { kind: "enum"; value: string }
  | { kind: "enum_custom"; value: string }
  | {
      kind: "new";
      name: string;
      /** When mapping an account FK; defaults to `other` at create time if omitted. */
      accountType?: MoneyImportAccountType;
      /**
       * When mapping a category_leaf FK: `null` = top-level root, UUID = under that parent.
       * `undefined` = user has not chosen yet (invalid until set).
       */
      parentCategoryId?: string | null;
    }
  | { kind: "ignore" };

export const VALUE_PICK_SELECT_ADD_NEW = "__money_add_new__";
export const VALUE_PICK_SELECT_IGNORE = "__money_ignore__";

export function mergeMatchValueRowKeys(
  distinct: string[],
  picks: Record<string, MoneyImportValuePick> | undefined,
): string[] {
  const seen = new Set(distinct);
  const extra = Object.keys(picks ?? {})
    .filter((k) => !seen.has(k))
    .sort((a, b) => a.localeCompare(b));
  return [...distinct, ...extra];
}

function isManualEnumBoolPick(
  f: MoneyImportFieldDef,
  csvKey: string,
  pick: MoneyImportValuePick,
): boolean {
  if (pick.kind === "ignore" || pick.kind === "enum_custom") return true;
  if (pick.kind !== "enum") return true;
  if (f.valueKind === "enum" && f.enumValues) {
    const auto = defaultEnumCanonical(csvKey, f.enumValues);
    if (auto === undefined) return true;
    return pick.value !== auto;
  }
  if (f.valueKind === "bool") {
    try {
      const b = parseBoolCell(csvKey);
      const autoStr = b ? "true" : "false";
      return pick.value !== autoStr;
    } catch {
      return true;
    }
  }
  return true;
}

function isManualFkPick(csvKey: string, pick: MoneyImportValuePick, entities: FkEntityRow[]): boolean {
  if (pick.kind === "ignore" || pick.kind === "new") return true;
  if (pick.kind !== "entity") return true;
  const nameHit = entities.find((e) => e.name.trim() === csvKey.trim());
  if (!nameHit) return true;
  return nameHit.id !== pick.entityId;
}

/** Sentinel for parent = top-level category (root with no parent). */
export const VALUE_PICK_CATEGORY_PARENT_TOP = "__money_category_top__";

export function effectiveFkSelectForRow(
  csvKey: string,
  pick: MoneyImportValuePick | undefined,
  entities: FkEntityRow[],
): { selectValue: string; isAutoFallback: boolean } {
  if (pick?.kind === "ignore") {
    return { selectValue: VALUE_PICK_SELECT_IGNORE, isAutoFallback: false };
  }
  if (pick?.kind === "entity") {
    return { selectValue: pick.entityId, isAutoFallback: false };
  }
  if (pick?.kind === "new") {
    return { selectValue: VALUE_PICK_SELECT_ADD_NEW, isAutoFallback: false };
  }
  const nameHit = entities.find((e) => e.name.trim() === csvKey.trim());
  if (nameHit) return { selectValue: nameHit.id, isAutoFallback: true };
  return { selectValue: "", isAutoFallback: false };
}

export function fkPickSatisfiesImport(
  f: MoneyImportFieldDef,
  csvKey: string,
  p: MoneyImportValuePick | undefined,
  entities: FkEntityRow[],
): boolean {
  if (!f.fk) return true;
  if (p?.kind === "ignore") return true;
  if (p?.kind === "entity") return true;
  if (p?.kind === "new") {
    if (!p.name.trim()) return false;
    if (f.fk === "category_leaf") {
      return p.parentCategoryId !== undefined;
    }
    return true;
  }
  const hit = entities.find((e) => e.name.trim() === csvKey.trim());
  return Boolean(hit);
}

export function enumBoolPickSatisfiesImport(
  f: MoneyImportFieldDef,
  csvKey: string,
  p: MoneyImportValuePick | undefined,
): boolean {
  if (p?.kind === "ignore") return true;
  if (p?.kind === "enum_custom") {
    if (f.valueKind !== "enum" || !f.enumValues) return false;
    return p.value.trim().length > 0;
  }
  if (p?.kind === "enum") return true;
  if (f.valueKind === "enum" && f.enumValues) {
    return defaultEnumCanonical(csvKey, f.enumValues) !== undefined;
  }
  if (f.valueKind === "bool") {
    try {
      return parseBoolCell(csvKey) !== undefined;
    } catch {
      return false;
    }
  }
  return false;
}

export function effectiveEnumBoolSelectForRow(
  f: MoneyImportFieldDef,
  csvKey: string,
  pick: MoneyImportValuePick | undefined,
): { selectValue: string; isAutoFallback: boolean } {
  if (pick?.kind === "ignore") {
    return { selectValue: VALUE_PICK_SELECT_IGNORE, isAutoFallback: false };
  }
  if (pick?.kind === "enum") {
    return { selectValue: pick.value, isAutoFallback: false };
  }
  if (pick?.kind === "enum_custom") {
    return { selectValue: VALUE_PICK_SELECT_ADD_NEW, isAutoFallback: false };
  }
  if (f.valueKind === "enum" && f.enumValues) {
    const auto = defaultEnumCanonical(csvKey, f.enumValues);
    if (auto !== undefined) return { selectValue: auto, isAutoFallback: true };
  }
  if (f.valueKind === "bool") {
    try {
      const b = parseBoolCell(csvKey);
      if (b !== undefined) return { selectValue: b ? "true" : "false", isAutoFallback: true };
    } catch {
      /* fall through */
    }
  }
  return { selectValue: "", isAutoFallback: false };
}

export function valuePicksToEnumBoolMap(
  picks: Record<string, MoneyImportValuePick> | undefined,
  enumValues?: readonly string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!picks) return out;
  for (const [csv, p] of Object.entries(picks)) {
    if (p.kind === "enum") out[csv] = p.value;
    else if (p.kind === "ignore") out[csv] = VALUE_MAP_IGNORE;
    else if (p.kind === "enum_custom") {
      if (!enumValues) continue;
      const v = p.value.trim();
      if (!v) continue;
      const c = defaultEnumCanonical(v, enumValues);
      if (c !== undefined) out[csv] = c;
      else out[csv] = v;
    }
  }
  return out;
}

export function buildFkIdByCsvMap(
  picks: Record<string, MoneyImportValuePick> | undefined,
  createdIdByCsv: Map<string, string>,
): Map<string, string> {
  const m = new Map<string, string>();
  if (!picks) return m;
  for (const [csv, p] of Object.entries(picks)) {
    if (p.kind === "entity") {
      m.set(csv, p.entityId);
    } else if (p.kind === "new") {
      const id = createdIdByCsv.get(csv);
      if (id) m.set(csv, id);
    }
  }
  return m;
}

export function pruneAndAutoFillEnumBoolPicks(
  f: MoneyImportFieldDef,
  distinct: string[],
  prev: Record<string, MoneyImportValuePick> | undefined,
): Record<string, MoneyImportValuePick> {
  const out: Record<string, MoneyImportValuePick> = {};
  const distinctSet = new Set(distinct);
  for (const d of distinct) {
    const existing = prev?.[d];
    if (
      existing?.kind === "ignore" ||
      existing?.kind === "enum" ||
      existing?.kind === "enum_custom"
    ) {
      out[d] = existing;
      continue;
    }
    if (f.valueKind === "enum" && f.enumValues) {
      const c = defaultEnumCanonical(d, f.enumValues);
      if (c !== undefined) out[d] = { kind: "enum", value: c };
    } else if (f.valueKind === "bool") {
      try {
        const b = parseBoolCell(d);
        if (b !== undefined) out[d] = { kind: "enum", value: b ? "true" : "false" };
      } catch {
        /* unmapped until user picks */
      }
    }
  }
  for (const [k, existing] of Object.entries(prev ?? {})) {
    if (distinctSet.has(k)) continue;
    if (isManualEnumBoolPick(f, k, existing)) out[k] = existing;
  }
  return out;
}

export function pruneAndAutoFillFkPicks(
  f: MoneyImportFieldDef,
  distinct: string[],
  entities: FkEntityRow[],
  prev: Record<string, MoneyImportValuePick> | undefined,
): Record<string, MoneyImportValuePick> {
  const out: Record<string, MoneyImportValuePick> = {};
  const distinctSet = new Set(distinct);
  for (const d of distinct) {
    const existing = prev?.[d];
    if (existing?.kind === "ignore" || existing?.kind === "entity" || existing?.kind === "new") {
      out[d] = existing;
      continue;
    }
    const nameHit = entities.find((e) => e.name.trim() === d.trim());
    if (nameHit) out[d] = { kind: "entity", entityId: nameHit.id };
  }
  for (const [k, existing] of Object.entries(prev ?? {})) {
    if (distinctSet.has(k)) continue;
    if (isManualFkPick(k, existing, entities)) out[k] = existing;
  }
  return out;
}

export function buildInitialValuePickByField(
  kind: MoneyImportKind,
  rows: Record<string, string>[],
  columnByField: Record<string, string>,
  headers: readonly string[],
  accounts: { id: string; name: string }[],
  merchants: { id: string; name: string }[],
  categories: MoneyCategoryRow[],
): Record<string, Record<string, MoneyImportValuePick>> {
  const defs = moneyImportFieldDefs(kind);
  const out: Record<string, Record<string, MoneyImportValuePick>> = {};
  for (const f of defs) {
    const col = columnByField[f.key] ?? "";
    if (!col) continue;
    const distinct = listDistinctForMoneyImportField(
      kind,
      f,
      rows,
      columnByField,
      headers,
      VALUE_MAP_DISTINCT_LIMIT,
    );
    if (f.valueKind === "enum" || f.valueKind === "bool") {
      out[f.key] = pruneAndAutoFillEnumBoolPicks(f, distinct, {});
    } else if (f.fk) {
      const entities = fkEntityRowsForField(f.fk, accounts, merchants, categories);
      out[f.key] = pruneAndAutoFillFkPicks(f, distinct, entities, {});
    }
  }
  return out;
}

type FkResolveCtx = {
  accounts: { id: string; name: string }[];
  merchants: { id: string; name: string }[];
  categories: MoneyCategoryRow[];
  tags?: { id: string; name: string }[];
};

export function resolveFkValue(
  field: MoneyImportFieldDef,
  raw: string,
  picksByCsv: Record<string, MoneyImportValuePick> | undefined,
  idByCsv: Map<string, string>,
  ctx: FkResolveCtx,
): string | null | undefined {
  const v = raw.trim();
  if (!v) return field.required ? undefined : null;
  if (!field.fk) return v;

  const pick = picksByCsv?.[v];
  if (pick?.kind === "ignore") return null;

  if (pick?.kind === "new") {
    const id = idByCsv.get(v);
    /** Preview passes an empty map until import creates entities. */
    if (!id) return undefined;
    return id;
  }

  if (idByCsv.has(v)) return idByCsv.get(v)!;

  if (field.fk === "account") {
    return resolveUniqueByName(ctx.accounts, v, "account");
  }
  if (field.fk === "merchant") {
    return resolveUniqueByName(ctx.merchants, v, "merchant");
  }
  if (field.fk === "category_root") {
    return resolveRootCategoryId(ctx.categories, v);
  }
  return resolveLeafCategoryId(ctx.categories, v);
}
