import {
  moneyImportFieldDefs,
  type MoneyImportFieldDef,
  type MoneyImportKind,
} from "@/lib/money-import-kinds";
import { parseBoolCell } from "@/lib/money-import-resolve";

export const VALUE_MAP_DISTINCT_LIMIT = 50;

export const VALUE_MAP_IGNORE = "__money_map_ignore__";

export function valueMapLookupKey(raw: string): string {
  return raw.trim();
}

export function listDistinctColumnValues(
  rows: Record<string, string>[],
  columnHeader: string,
  limit: number,
): string[] {
  if (!columnHeader) return [];
  const seen = new Set<string>();
  const order: string[] = [];
  for (const r of rows) {
    const v = r[columnHeader];
    if (v === undefined || v === null) continue;
    const k = v.trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    order.push(k);
    if (order.length >= limit) break;
  }
  return order;
}

function normalizeCsvHeaderName(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

export function accountsAuxiliaryTypeColumnHeaders(
  headers: readonly string[],
  typeMappedHeader: string,
): string[] {
  const primaryNorm = typeMappedHeader ? normalizeCsvHeaderName(typeMappedHeader) : "";
  const auxNorms = new Set([
    "type",
    "subtype",
    "account_type",
    "account_subtype",
    "account_sub_type",
    "sub_type",
    "detailed_type",
  ]);
  const out: string[] = [];
  const seenHeader = new Set<string>();
  const seenNorm = new Set<string>();
  for (const h of headers) {
    if (!h || h === typeMappedHeader) continue;
    const n = normalizeCsvHeaderName(h);
    if (!auxNorms.has(n)) continue;
    if (n === primaryNorm) continue;
    if (seenHeader.has(h) || seenNorm.has(n)) continue;
    seenHeader.add(h);
    seenNorm.add(n);
    out.push(h);
  }
  return out;
}

function mergeDistinctStringLists(primary: string[], secondary: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of primary) {
    if (out.length >= limit) return out;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  for (const v of secondary) {
    if (out.length >= limit) break;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export function listDistinctAccountsTypeColumnValues(
  rows: Record<string, string>[],
  typeColumnHeader: string,
  auxiliaryColumnHeaders: readonly string[],
  limit: number,
): string[] {
  if (!typeColumnHeader) return [];
  let acc = listDistinctColumnValues(rows, typeColumnHeader, limit);
  for (const aux of auxiliaryColumnHeaders) {
    if (!aux || aux === typeColumnHeader) continue;
    const part = listDistinctColumnValues(rows, aux, limit);
    acc = mergeDistinctStringLists(acc, part, limit);
  }
  return acc;
}

export function accountsTypeImportTypeSideDistinct(
  rows: Record<string, string>[],
  columnByField: Record<string, string>,
  headers: readonly string[],
  limit: number,
): string[] {
  const typeCol = columnByField.type ?? "";
  if (!typeCol) return [];
  const aux = accountsAuxiliaryTypeColumnHeaders(headers, typeCol);
  return listDistinctAccountsTypeColumnValues(rows, typeCol, aux, limit);
}

/** Parent column skipped: every row is treated as having no parent in CSV — one mapping for all. */
export function categoriesImportParentIdNeedsSyntheticDistinct(
  kind: MoneyImportKind,
  f: MoneyImportFieldDef,
  columnHeader: string,
): boolean {
  return (
    kind === "categories" &&
    f.key === "parentId" &&
    Boolean(f.fk) &&
    columnHeader.trim() === ""
  );
}

export function includeMoneyImportValueMappingColumn(
  kind: MoneyImportKind,
  f: MoneyImportFieldDef,
  columnHeader: string,
): boolean {
  if (columnHeader.trim()) return true;
  return categoriesImportParentIdNeedsSyntheticDistinct(kind, f, columnHeader);
}

export function listDistinctForMoneyImportField(
  kind: MoneyImportKind,
  f: MoneyImportFieldDef,
  rows: Record<string, string>[],
  columnByField: Record<string, string>,
  headers: readonly string[],
  limit: number,
): string[] {
  const col = columnByField[f.key] ?? "";
  if (!col) return [];
  if (kind === "accounts" && f.key === "type") {
    const aux = accountsAuxiliaryTypeColumnHeaders(headers, col);
    const typeSide = listDistinctAccountsTypeColumnValues(rows, col, aux, limit);
    return typeSide;
  }
  return listDistinctColumnValues(rows, col, limit);
}

export function accountTypeRawForImportRow(
  row: Record<string, string>,
  typeColumnHeader: string,
  auxiliaryColumnHeaders: readonly string[],
): string {
  if (typeColumnHeader) {
    const v = row[typeColumnHeader];
    if (v !== undefined && v !== null && String(v).trim()) return String(v);
  }
  for (const aux of auxiliaryColumnHeaders) {
    if (!aux || aux === typeColumnHeader) continue;
    const v = row[aux];
    if (v !== undefined && v !== null && String(v).trim()) return String(v);
  }
  return "";
}

export function defaultEnumCanonical(
  raw: string,
  enumValues: readonly string[],
): string | undefined {
  const k = raw.trim().toLowerCase();
  if (!k) return undefined;
  for (const ev of enumValues) {
    if (ev.toLowerCase() === k) return ev;
  }
  return undefined;
}

export function rebuildFieldValueMap(
  f: MoneyImportFieldDef,
  distinct: string[],
  previous: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  const prev = previous ?? {};
  for (const d of distinct) {
    if (prev[d] !== undefined) out[d] = prev[d]!;
  }
  return out;
}

export function buildAllValueMaps(
  kind: MoneyImportKind,
  rows: Record<string, string>[],
  columnByField: Record<string, string>,
  seedPrevious: Record<string, Record<string, string>>,
): Record<string, Record<string, string>> {
  const defs = moneyImportFieldDefs(kind);
  const out: Record<string, Record<string, string>> = {};
  for (const f of defs) {
    if (f.valueKind !== "enum" && f.valueKind !== "bool") continue;
    const col = columnByField[f.key] ?? "";
    if (!col) {
      out[f.key] = {};
      continue;
    }
    const distinct = listDistinctColumnValues(rows, col, VALUE_MAP_DISTINCT_LIMIT);
    out[f.key] = rebuildFieldValueMap(f, distinct, seedPrevious[f.key]);
  }
  return out;
}

export function resolveEnumForImport(
  raw: string,
  fieldLabel: string,
  enumValues: readonly string[],
  valueMap: Record<string, string> | undefined,
): string {
  const k = raw.trim();
  if (!k) return "";
  const map = valueMap ?? {};
  if (map[k] === VALUE_MAP_IGNORE) return "";
  if (map[k] !== undefined && map[k] !== "") {
    const target = map[k]!;
    if (!enumValues.includes(target)) {
      throw new Error(
        `${fieldLabel}: mapped target "${target}" is not allowed for CSV value "${k}"`,
      );
    }
    return target;
  }
  const auto = defaultEnumCanonical(k, enumValues);
  if (auto !== undefined) return auto;
  throw new Error(
    `${fieldLabel}: unmapped CSV value "${k}". Allowed: ${enumValues.join(", ")} — set it in Match values.`,
  );
}

export function resolveAccountsTypeEnumForImport(
  row: Record<string, string>,
  nameColumnHeader: string,
  typeColumnHeader: string,
  typeAuxiliaryHeaders: readonly string[],
  fieldLabel: string,
  enumValues: readonly string[],
  valueMap: Record<string, string> | undefined,
): string {
  const map = valueMap ?? {};
  const nameRaw = nameColumnHeader ? String(row[nameColumnHeader] ?? "").trim() : "";
  const typeRaw = typeColumnHeader
    ? accountTypeRawForImportRow(row, typeColumnHeader, typeAuxiliaryHeaders).trim()
    : "";
  if (nameRaw && map[nameRaw] !== undefined && map[nameRaw] !== "") {
    return resolveEnumForImport(nameRaw, fieldLabel, enumValues, valueMap);
  }
  if (typeRaw) {
    try {
      return resolveEnumForImport(typeRaw, fieldLabel, enumValues, valueMap);
    } catch {
      /* fall through */
    }
  }
  if (nameRaw) {
    return resolveEnumForImport(nameRaw, fieldLabel, enumValues, valueMap);
  }
  return "";
}

export function resolveBoolForImportOptional(
  raw: string,
  fieldLabel: string,
  valueMap: Record<string, string> | undefined,
): boolean | undefined {
  const k = raw.trim();
  if (!k) return undefined;
  const map = valueMap ?? {};
  if (map[k] === VALUE_MAP_IGNORE) return undefined;
  if (map[k] === "true" || map[k] === "false") {
    return map[k] === "true";
  }
  try {
    const parsed = parseBoolCell(raw);
    if (parsed !== undefined) return parsed;
  } catch {
    /* fall through */
  }
  throw new Error(
    `${fieldLabel}: unmapped boolean "${k}". Map it to true or false in Match values, or use yes/no, 1/0.`,
  );
}

export type ValueResolutionStatus = "ok" | "unmapped" | "invalid";

export function enumResolutionRow(
  csvValue: string,
  enumValues: readonly string[],
  valueMap: Record<string, string>,
): { resolved: string | null; status: ValueResolutionStatus } {
  const k = csvValue.trim();
  if (!k) return { resolved: null, status: "ok" };
  if (valueMap[k] === VALUE_MAP_IGNORE) return { resolved: null, status: "ok" };
  if (valueMap[k] !== undefined && valueMap[k] !== "") {
    if (enumValues.includes(valueMap[k]!)) {
      return { resolved: valueMap[k]!, status: "ok" };
    }
    return { resolved: valueMap[k]!, status: "invalid" };
  }
  const auto = defaultEnumCanonical(k, enumValues);
  if (auto !== undefined) return { resolved: auto, status: "ok" };
  return { resolved: null, status: "unmapped" };
}

export function boolResolutionRow(
  csvValue: string,
  valueMap: Record<string, string>,
): { resolved: string | null; status: ValueResolutionStatus } {
  const k = csvValue.trim();
  if (!k) return { resolved: null, status: "ok" };
  if (valueMap[k] === VALUE_MAP_IGNORE) return { resolved: null, status: "ok" };
  if (valueMap[k] === "true" || valueMap[k] === "false") {
    return { resolved: valueMap[k]!, status: "ok" };
  }
  try {
    const b = parseBoolCell(k);
    if (b !== undefined) return { resolved: String(b), status: "ok" };
  } catch {
    return { resolved: null, status: "invalid" };
  }
  return { resolved: null, status: "unmapped" };
}

export function previewResolvedEnumOrBool(
  f: MoneyImportFieldDef,
  rawSample: string | null,
  valueMap: Record<string, string> | undefined,
): string | null {
  if (!rawSample || !rawSample.trim()) return null;
  if (f.valueKind === "enum" && f.enumValues) {
    try {
      return resolveEnumForImport(rawSample, f.label, f.enumValues, valueMap);
    } catch {
      return null;
    }
  }
  if (f.valueKind === "bool") {
    try {
      const b = resolveBoolForImportOptional(rawSample, f.label, valueMap);
      if (b === undefined) return null;
      return String(b);
    } catch {
      return null;
    }
  }
  return null;
}

export function flattenPreviewRow(row: unknown): Record<string, string> {
  if (row === null || typeof row !== "object" || Array.isArray(row)) {
    return { value: String(row) };
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out[k] = JSON.stringify(v);
    } else if (Array.isArray(v)) {
      out[k] = JSON.stringify(v);
    } else {
      out[k] = v === undefined || v === null ? "" : String(v);
    }
  }
  return out;
}
