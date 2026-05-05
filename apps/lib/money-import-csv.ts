import { parse } from "csv-parse/sync";
import { z } from "zod";
import {
  accountCreateSchema,
  budgetCreateSchema,
  recurrentCreateSchema,
  ruleCreateSchema,
} from "@/lib/validators/money";
import { allowedKeysForImportType } from "@/lib/money-import-column-map";
import {
  categoryImportRowSchema,
  moneyImportTypeSchema,
  transactionImportRowSchema,
  type ImportPreviewPayload,
  type MoneyImportType,
} from "@/lib/money-import-types";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function headerToCamel(h: string): string {
  const parts = h
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (!parts.length) return "";
  return (
    parts[0] + parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("")
  );
}

function parseCsvToRecords(text: string): {
  headers: string[];
  records: Record<string, string>[];
} {
  const all = parse(text, {
    columns: false,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
  }) as string[][];
  if (!all.length) return { headers: [], records: [] };
  const headers = all[0].map((h, i) => {
    const t = String(h ?? "").trim();
    return t || `column_${i + 1}`;
  });
  const records = all.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = String(cells[i] ?? "").trim();
    }
    return row;
  });
  return { headers, records };
}

function splitCommaUuids(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function splitCommaNames(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function coerceOptionalString(v: unknown): string | undefined {
  if (v == null) return undefined;
  const t = String(v).trim();
  return t === "" ? undefined : t;
}

function coerceRequiredString(v: unknown): string | undefined {
  const t = coerceOptionalString(v);
  return t;
}

function coerceInt(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(String(v).trim().replace(/,/g, ""));
  if (!Number.isFinite(n)) return undefined;
  return Math.trunc(n);
}

function coerceBool(v: unknown): boolean | undefined {
  const s = coerceOptionalString(v);
  if (s === undefined) return undefined;
  const l = s.toLowerCase();
  if (["true", "1", "yes", "y"].includes(l)) return true;
  if (["false", "0", "no", "n"].includes(l)) return false;
  return undefined;
}

function normalizeRow(
  raw: Record<string, unknown>,
  type: MoneyImportType,
): { row: Record<string, unknown>; unknownKeys: string[] } {
  const allowed = allowedKeysForImportType(type);
  const row: Record<string, unknown> = {};
  const unknownKeys: string[] = [];

  for (const [k, val] of Object.entries(raw)) {
    const key = headerToCamel(k);
    if (!key) continue;
    if (!allowed.has(key)) {
      unknownKeys.push(k);
      continue;
    }
    row[key] = val;
  }

  return { row, unknownKeys };
}

/** User-defined CSV header → internal field; omit or "" / __ignore__ to skip column. */
function normalizeRowWithMap(
  raw: Record<string, unknown>,
  columnMap: Record<string, string>,
  type: MoneyImportType,
): Record<string, unknown> {
  const allowed = allowedKeysForImportType(type);
  const row: Record<string, unknown> = {};
  for (const [csvKey, val] of Object.entries(raw)) {
    if (!Object.prototype.hasOwnProperty.call(columnMap, csvKey)) continue;
    const rawTarget = columnMap[csvKey];
    const target = String(rawTarget ?? "").trim();
    if (target === "" || target === "__ignore__") continue;
    if (!allowed.has(target)) continue;
    row[target] = val;
  }
  return row;
}

const ACCOUNT_TYPES = [
  "checking",
  "savings",
  "cash",
  "credit",
  "loan",
  "investment",
  "other",
] as const;

type AccountTypeImport = (typeof ACCOUNT_TYPES)[number];

/** Map common export labels (Plaid, banks, spreadsheets) to `accountCreateSchema` enum. */
function mapAccountTypeFromImport(raw: string): AccountTypeImport | undefined {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (!slug) return undefined;
  if ((ACCOUNT_TYPES as readonly string[]).includes(slug)) {
    return slug as AccountTypeImport;
  }
  const aliases: Record<string, AccountTypeImport> = {
    creditcard: "credit",
    debitcard: "cash",
    moneymarket: "savings",
    moneymarketaccount: "savings",
    cd: "savings",
    certificateofdeposit: "savings",
    brokerage: "investment",
    ira: "investment",
    "401k": "investment",
    investmentretirement: "investment",
    prepaid: "cash",
    paypal: "cash",
    safe: "savings",
    lineofcredit: "credit",
    homelineofcredit: "credit",
    heloc: "credit",
    mortgage: "loan",
    student: "loan",
    consumer: "loan",
    business: "other",
    depository: "other",
    bank: "other",
    checkingaccount: "checking",
    savingsaccount: "savings",
    investmentaccount: "investment",
    stock: "investment",
    crypto: "investment",
    trust: "investment",
    estate: "investment",
    mutualfund: "investment",
    fixedannuity: "investment",
    variableannuity: "investment",
    retirement: "investment",
    pension: "investment",
    profitsharingplan: "investment",
    educationalsavingsaccount: "savings",
    healthsavingsaccount: "cash",
    medical: "other",
    hsa: "cash",
    fsa: "cash",
    otherinsurance: "other",
    lifeinsurance: "other",
    auto: "other",
    cashmanagement: "cash",
    moneymarketfund: "savings",
    treasury: "investment",
    trustinvestment: "investment",
    ugma: "investment",
    utma: "investment",
    annuity: "investment",
  };
  return aliases[slug];
}

function mapAccountRow(row: Record<string, unknown>): unknown {
  const out: Record<string, unknown> = {};
  const name = coerceRequiredString(row.name);
  if (name !== undefined) out.name = name;
  const typeVal = coerceOptionalString(row.type);
  if (typeVal !== undefined) {
    const mapped = mapAccountTypeFromImport(typeVal);
    if (mapped !== undefined) out.type = mapped;
  }
  const currency = coerceOptionalString(row.currency);
  if (currency !== undefined) out.currency = currency;
  const institution = coerceOptionalString(row.institution);
  if (institution !== undefined) out.institution = institution;
  const balanceMinor = coerceInt(row.balanceMinor);
  if (balanceMinor !== undefined) out.balanceMinor = balanceMinor;
  const sortOrder = coerceInt(row.sortOrder);
  if (sortOrder !== undefined) out.sortOrder = sortOrder;
  const archived = coerceBool(row.archived);
  if (archived !== undefined) out.archived = archived;
  return out;
}

function mapCategoryRow(row: Record<string, unknown>): unknown {
  const out: Record<string, unknown> = {};
  const name = coerceRequiredString(row.name);
  if (name !== undefined) out.name = name;
  const parentId = coerceOptionalString(row.parentId);
  if (parentId !== undefined) out.parentId = parentId;
  const parentSourceId = coerceOptionalString(row.parentSourceId);
  if (parentSourceId !== undefined && UUID_RE.test(parentSourceId)) {
    out.parentSourceId = parentSourceId;
  }
  const sourceId = coerceOptionalString(row.sourceId);
  if (sourceId !== undefined && UUID_RE.test(sourceId)) out.sourceId = sourceId;
  const archived = coerceBool(row.archived);
  if (archived !== undefined) out.archived = archived;
  return out;
}

function mapBudgetRow(row: Record<string, unknown>): unknown {
  const out: Record<string, unknown> = {};
  const categoryId = coerceOptionalString(row.categoryId);
  if (categoryId !== undefined) {
    out.categoryId = categoryId;
  }
  const periodStart = coerceOptionalString(row.periodStart);
  if (periodStart !== undefined) out.periodStart = periodStart;
  const periodEnd = coerceOptionalString(row.periodEnd);
  if (periodEnd !== undefined) out.periodEnd = periodEnd;
  const limit = coerceInt(row.limitAmountMinor);
  if (limit !== undefined) out.limitAmountMinor = limit;
  const currency = coerceOptionalString(row.currency);
  if (currency !== undefined) out.currency = currency;
  return out;
}

function mapTransactionRow(row: Record<string, unknown>): unknown {
  const out: Record<string, unknown> = {};
  const accountId = coerceOptionalString(row.accountId);
  if (accountId !== undefined) out.accountId = accountId;
  const kindRaw = coerceOptionalString(row.kind);
  if (kindRaw !== undefined) {
    const k = kindRaw.toLowerCase();
    if (["expense", "income", "transfer"].includes(k)) out.kind = k;
  }
  const amountMinor = coerceInt(row.amountMinor);
  if (amountMinor !== undefined) out.amountMinor = amountMinor;
  const occurredAt = coerceOptionalString(row.occurredAt);
  if (occurredAt !== undefined) out.occurredAt = occurredAt;
  for (const key of ["categoryId", "merchantId"] as const) {
    const v = coerceOptionalString(row[key]);
    if (v !== undefined) out[key] = v;
  }
  const notes = coerceOptionalString(row.notes);
  if (notes !== undefined) out.notes = notes;
  const tagIdsRaw = coerceOptionalString(row.tagIds);
  if (tagIdsRaw !== undefined) {
    const ids = splitCommaUuids(tagIdsRaw);
    if (ids.length) out.tagIds = ids;
  }
  const tagNamesRaw = coerceOptionalString(row.tagNames);
  if (tagNamesRaw !== undefined) {
    const names = splitCommaNames(tagNamesRaw);
    if (names.length) out.tagNames = names;
  }
  const transferGroupId = coerceOptionalString(row.transferGroupId);
  if (transferGroupId !== undefined) out.transferGroupId = transferGroupId;
  return out;
}

function mapRuleRow(row: Record<string, unknown>): unknown {
  const matchJson = coerceOptionalString(row.matchJson);
  const actionJson = coerceOptionalString(row.actionJson);
  if (matchJson && actionJson) {
    try {
      const match = JSON.parse(matchJson) as unknown;
      const action = JSON.parse(actionJson) as unknown;
      const out: Record<string, unknown> = {
        name: coerceRequiredString(row.name),
        match,
        action,
      };
      const p = coerceInt(row.priority);
      if (p !== undefined) out.priority = p;
      const a = coerceBool(row.active);
      if (a !== undefined) out.active = a;
      return out;
    } catch {
      return { name: coerceRequiredString(row.name), _parseError: true };
    }
  }

  const out: Record<string, unknown> = {};
  const name = coerceRequiredString(row.name);
  if (name !== undefined) out.name = name;
  const p = coerceInt(row.priority);
  if (p !== undefined) out.priority = p;
  const a = coerceBool(row.active);
  if (a !== undefined) out.active = a;

  const match: Record<string, unknown> = {};
  const ma = coerceOptionalString(row.matchAccountId);
  if (ma && UUID_RE.test(ma)) match.accountId = ma;
  const mm = coerceOptionalString(row.matchMerchantId);
  if (mm && UUID_RE.test(mm)) match.merchantId = mm;
  out.match = match;

  const action: Record<string, unknown> = {};
  const sc = coerceOptionalString(row.actionSetCategoryId);
  if (sc && UUID_RE.test(sc)) action.setCategoryId = sc;
  const tags = coerceOptionalString(row.actionTagIds);
  if (tags) {
    const ids = splitCommaUuids(tags);
    if (ids.length) action.tagIds = ids;
  }
  out.action = action;
  return out;
}

function mapRecurrenceRow(row: Record<string, unknown>): unknown {
  const templateJson = coerceOptionalString(row.templateJson);
  if (templateJson) {
    try {
      const template = JSON.parse(templateJson) as unknown;
      const out: Record<string, unknown> = {
        name: coerceRequiredString(row.name),
        cadence: coerceOptionalString(row.cadence),
        nextRunAt: coerceOptionalString(row.nextRunAt),
        template,
      };
      const a = coerceBool(row.active);
      if (a !== undefined) out.active = a;
      return out;
    } catch {
      return { name: coerceRequiredString(row.name), _parseError: true };
    }
  }

  const out: Record<string, unknown> = {};
  const name = coerceRequiredString(row.name);
  if (name !== undefined) out.name = name;
  const cadence = coerceOptionalString(row.cadence);
  if (cadence !== undefined) out.cadence = cadence.toLowerCase();
  const nextRunAt = coerceOptionalString(row.nextRunAt);
  if (nextRunAt !== undefined) out.nextRunAt = nextRunAt;
  const a = coerceBool(row.active);
  if (a !== undefined) out.active = a;

  const template: Record<string, unknown> = {};
  const acc = coerceOptionalString(row.templateAccountId);
  if (acc !== undefined) template.accountId = acc;
  const k = coerceOptionalString(row.templateKind);
  if (k !== undefined) {
    const low = k.toLowerCase();
    if (["expense", "income", "transfer"].includes(low)) template.kind = low;
  }
  const amt = coerceInt(row.templateAmountMinor);
  if (amt !== undefined) template.amountMinor = amt;
  const cat = coerceOptionalString(row.templateCategoryId);
  if (cat !== undefined) {
    template.categoryId = UUID_RE.test(cat) ? cat : null;
  }
  const mer = coerceOptionalString(row.templateMerchantId);
  if (mer !== undefined) {
    template.merchantId = UUID_RE.test(mer) ? mer : null;
  }
  const notes = coerceOptionalString(row.templateNotes);
  if (notes !== undefined) template.notes = notes;
  const ttags = coerceOptionalString(row.templateTagIds);
  if (ttags) {
    const ids = splitCommaUuids(ttags);
    if (ids.length) template.tagIds = ids;
  }
  out.template = template;
  return out;
}

function mapRowForType(
  row: Record<string, unknown>,
  type: MoneyImportType,
): unknown {
  switch (type) {
    case "accounts":
      return mapAccountRow(row);
    case "categories":
      return mapCategoryRow(row);
    case "budgets":
      return mapBudgetRow(row);
    case "transactions":
      return mapTransactionRow(row);
    case "rules":
      return mapRuleRow(row);
    case "recurrence":
      return mapRecurrenceRow(row);
    default: {
      const _e: never = type;
      return _e;
    }
  }
}

function validateMappedRow(
  mapped: unknown,
  type: MoneyImportType,
):
  | { ok: true; data: unknown }
  | { ok: false; message: string } {
  if (
    type === "rules" &&
    mapped &&
    typeof mapped === "object" &&
    "_parseError" in mapped
  ) {
    return { ok: false, message: "Invalid matchJson/actionJson" };
  }
  if (
    type === "recurrence" &&
    mapped &&
    typeof mapped === "object" &&
    "_parseError" in mapped
  ) {
    return { ok: false, message: "Invalid templateJson" };
  }

  switch (type) {
    case "accounts": {
      const p = accountCreateSchema.safeParse(mapped);
      return p.success
        ? { ok: true, data: p.data }
        : { ok: false, message: p.error.issues.map((i) => i.message).join("; ") };
    }
    case "categories": {
      const p = categoryImportRowSchema.safeParse(mapped);
      return p.success
        ? { ok: true, data: p.data }
        : { ok: false, message: p.error.issues.map((i) => i.message).join("; ") };
    }
    case "budgets": {
      const p = budgetCreateSchema.safeParse(mapped);
      return p.success
        ? { ok: true, data: p.data }
        : { ok: false, message: p.error.issues.map((i) => i.message).join("; ") };
    }
    case "transactions": {
      const p = transactionImportRowSchema.safeParse(mapped);
      return p.success
        ? { ok: true, data: p.data }
        : { ok: false, message: p.error.issues.map((i) => i.message).join("; ") };
    }
    case "rules": {
      const p = ruleCreateSchema.safeParse(mapped);
      return p.success
        ? { ok: true, data: p.data }
        : { ok: false, message: p.error.issues.map((i) => i.message).join("; ") };
    }
    case "recurrence": {
      const p = recurrentCreateSchema.safeParse(mapped);
      return p.success
        ? { ok: true, data: p.data }
        : { ok: false, message: p.error.issues.map((i) => i.message).join("; ") };
    }
    default: {
      const _ex: never = type;
      return _ex;
    }
  }
}

function validateCategoryParentRefs(
  rows: { sourceId?: string; parentSourceId?: string }[],
): { ok: false; message: string; rowNumber: number } | { ok: true } {
  const sourceIds = new Set(
    rows.map((r) => r.sourceId).filter((x): x is string => Boolean(x)),
  );
  for (let i = 0; i < rows.length; i++) {
    const ps = rows[i].parentSourceId;
    if (ps && !sourceIds.has(ps)) {
      return {
        ok: false,
        rowNumber: i + 2,
        message: `parentSourceId "${ps}" not found as sourceId in this file`,
      };
    }
  }
  return { ok: true };
}

export function parseMoneyImportCsv(
  text: string,
  importTypeRaw: string,
  columnMap?: Record<string, string> | null,
):
  | { ok: false; error: string }
  | { ok: true; preview: ImportPreviewPayload; importType: MoneyImportType } {
  const typeParsed = moneyImportTypeSchema.safeParse(importTypeRaw);
  if (!typeParsed.success) {
    return { ok: false, error: "Invalid import type" };
  }
  const importType = typeParsed.data;

  const useManualMap = columnMap != null;
  let records: Record<string, string>[];
  let csvHeaders: string[];
  try {
    const parsed = parseCsvToRecords(text);
    records = parsed.records;
    csvHeaders = parsed.headers;
  } catch {
    return { ok: false, error: "Could not parse CSV" };
  }

  const errors: ImportPreviewPayload["errors"] = [];
  const warnings: ImportPreviewPayload["warnings"] = [];
  const validRows: unknown[] = [];
  const globalUnknown = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    const rowNumber = i + 2;
    const raw = records[i] as Record<string, unknown>;
    let row: Record<string, unknown>;
    if (useManualMap) {
      row = normalizeRowWithMap(raw, columnMap!, importType);
    } else {
      const normalized = normalizeRow(raw, importType);
      row = normalized.row;
      for (const uk of normalized.unknownKeys) globalUnknown.add(uk);
    }

    const mapped = mapRowForType(row, importType);
    const validated = validateMappedRow(mapped, importType);
    if (!validated.ok) {
      errors.push({ rowNumber, message: validated.message });
      continue;
    }

    validRows.push(validated.data);
  }

  if (!useManualMap) {
    for (const uk of globalUnknown) {
      warnings.push({ message: `Unrecognized column ignored: ${uk}` });
    }
  }

  if (importType === "categories" && validRows.length) {
    const refs = validRows.map((r) => {
      const cr = r as z.infer<typeof categoryImportRowSchema>;
      return { sourceId: cr.sourceId, parentSourceId: cr.parentSourceId };
    });
    const ref = validateCategoryParentRefs(refs);
    if (!ref.ok) {
      errors.push({ rowNumber: ref.rowNumber, message: ref.message });
      validRows.length = 0;
    }
  }

  const total = records.length;

  return {
    ok: true,
    importType,
    preview: {
      csvHeaders,
      rows: validRows,
      errors,
      warnings,
      summary: {
        total,
        valid: validRows.length,
        invalid: total - validRows.length,
      },
    },
  };
}

/** Re-validate rows for commit (same shapes as preview output). */
export function validateRowsForCommit(
  type: MoneyImportType,
  rows: unknown[],
): { ok: true; rows: unknown[] } | { ok: false; message: string } {
  const out: unknown[] = [];
  for (let i = 0; i < rows.length; i++) {
    const validated = validateMappedRow(rows[i], type);
    if (!validated.ok) {
      return {
        ok: false,
        message: `Row ${i + 1}: ${validated.message}`,
      };
    }
    out.push(validated.data);
  }

  if (type === "categories") {
    const refs = out.map((r) => {
      const x = r as z.infer<typeof categoryImportRowSchema>;
      return { sourceId: x.sourceId, parentSourceId: x.parentSourceId };
    });
    const ref = validateCategoryParentRefs(refs);
    if (!ref.ok) {
      return { ok: false, message: ref.message };
    }
  }

  return { ok: true, rows: out };
}
