import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyAccount,
  moneyBudget,
  moneyCategory,
  moneyMerchant,
  moneyRecurrentTemplate,
  moneyRule,
  moneyTag,
  moneyTransaction,
} from "@/db/schema/money";
import {
  isMoneyImportKind,
  MONEY_IMPORT_ALL_ORDER,
  moneyImportFieldDefs,
  type MoneyImportKind,
} from "@/lib/money-import-kinds";
import {
  csvResponse,
  exportMaxBytes,
  exportMaxRows,
  exportTooLargeResponse,
  rowsToCsv,
} from "@/lib/export-csv";
import { buildZip, zipResponse } from "@/lib/export-zip";

export const MONEY_EXPORT_MAX_ROWS = exportMaxRows(
  "MONEY_EXPORT_MAX_ROWS",
  100_000,
);
export const MONEY_EXPORT_MAX_BYTES = exportMaxBytes(
  "MONEY_EXPORT_MAX_BYTES",
  5_242_880,
);

export function isExportableMoneyKind(value: string): value is MoneyImportKind {
  return isMoneyImportKind(value);
}

function rowFromRecord(
  kind: MoneyImportKind,
  record: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const def of moneyImportFieldDefs(kind)) {
    out[def.key] = record[def.key] ?? "";
  }
  return out;
}

export function moneyExportCsv(
  kind: MoneyImportKind | string,
  rows: Record<string, unknown>[],
): string {
  if (!isMoneyImportKind(kind)) {
    throw new Error(`Unknown money export kind: ${kind}`);
  }
  const headers = moneyImportFieldDefs(kind).map((d) => d.key);
  const normalized = rows.map((r) => rowFromRecord(kind, r));
  return rowsToCsv(headers, normalized);
}

export function buildMoneyExportResponse(
  kind: MoneyImportKind | string,
  rows: Record<string, unknown>[],
): Response {
  if (!isMoneyImportKind(kind)) {
    return Response.json(
      { error: "Unknown export kind", code: "bad_request" },
      { status: 400 },
    );
  }
  if (rows.length > MONEY_EXPORT_MAX_ROWS) {
    return exportTooLargeResponse(
      `Export exceeds max rows (${MONEY_EXPORT_MAX_ROWS}).`,
    );
  }
  const csv = moneyExportCsv(kind, rows);
  const bytes = new TextEncoder().encode(csv).byteLength;
  if (bytes > MONEY_EXPORT_MAX_BYTES) {
    return exportTooLargeResponse(
      `Export exceeds max bytes (${MONEY_EXPORT_MAX_BYTES}).`,
    );
  }
  return csvResponse(`money-${kind}.csv`, csv);
}

type RuleMatch = {
  accountId?: string | null;
  merchantId?: string | null;
};
type RuleAction = {
  setCategoryId?: string | null;
  tagIds?: string[] | null;
};
type RecurrentTemplate = {
  accountId?: string;
  kind?: string;
  amountMinor?: number;
  categoryId?: string | null;
  merchantId?: string | null;
  notes?: string | null;
  tagIds?: string[] | null;
  tagNames?: string[] | null;
};

export async function loadMoneyExportRows(
  workspaceId: string,
  kind: MoneyImportKind,
): Promise<Record<string, unknown>[]> {
  const limit = MONEY_EXPORT_MAX_ROWS + 1;
  switch (kind) {
    case "accounts": {
      const rows = await db
        .select({
          id: moneyAccount.id,
          name: moneyAccount.name,
          type: moneyAccount.type,
          currency: moneyAccount.currency,
          institution: moneyAccount.institution,
          balanceMinor: moneyAccount.balanceMinor,
          sortOrder: moneyAccount.sortOrder,
          archived: moneyAccount.archived,
          systemKey: moneyAccount.systemKey,
        })
        .from(moneyAccount)
        .where(eq(moneyAccount.workspaceId, workspaceId))
        .limit(limit);
      return rows.map((r) => ({
        name: r.name,
        type: r.type,
        currency: r.currency,
        institution: r.institution ?? "",
        balanceMinor: r.balanceMinor,
        sortOrder: r.sortOrder,
        archived: Boolean(r.archived),
        // Round-trip after reset: merge onto seeded system accounts by key.
        systemKey: r.systemKey ?? "",
        // Remap budgets/transactions/rules FKs after reset.
        sourceId: r.id,
      }));
    }
    case "categories": {
      const rows = await db
        .select({
          id: moneyCategory.id,
          name: moneyCategory.name,
          kind: moneyCategory.kind,
          parentId: moneyCategory.parentId,
          archived: moneyCategory.archived,
        })
        .from(moneyCategory)
        .where(eq(moneyCategory.workspaceId, workspaceId))
        .limit(limit);
      // Round-trip after reset: use sourceId/parentSourceId (remapped on
      // import). Never emit live parentId UUIDs — they die on workspace reset.
      return rows.map((r) => ({
        name: r.name,
        kind: r.kind,
        sourceId: r.id,
        parentSourceId: r.parentId ?? "",
        parentId: "",
        archived: Boolean(r.archived),
      }));
    }
    case "merchants": {
      const rows = await db
        .select({
          id: moneyMerchant.id,
          name: moneyMerchant.name,
          normalizedName: moneyMerchant.normalizedName,
        })
        .from(moneyMerchant)
        .where(eq(moneyMerchant.workspaceId, workspaceId))
        .limit(limit);
      return rows.map((r) => ({
        name: r.name,
        normalizedName: r.normalizedName ?? "",
        sourceId: r.id,
      }));
    }
    case "tags": {
      const rows = await db
        .select({
          id: moneyTag.id,
          name: moneyTag.name,
          color: moneyTag.color,
        })
        .from(moneyTag)
        .where(eq(moneyTag.workspaceId, workspaceId))
        .limit(limit);
      return rows.map((r) => ({
        name: r.name,
        color: r.color ?? "",
        sourceId: r.id,
      }));
    }
    case "budgets": {
      const rows = await db
        .select({
          scopeType: moneyBudget.scopeType,
          scopeId: moneyBudget.scopeId,
          limitAmountMinor: moneyBudget.limitAmountMinor,
          currency: moneyBudget.currency,
        })
        .from(moneyBudget)
        .where(eq(moneyBudget.workspaceId, workspaceId))
        .limit(limit);
      return rows.map((r) => ({
        ...r,
        scopeId: r.scopeId ?? "",
      }));
    }
    case "transactions": {
      const rows = await db
        .select({
          accountId: moneyTransaction.accountId,
          kind: moneyTransaction.kind,
          amountMinor: moneyTransaction.amountMinor,
          occurredAt: moneyTransaction.occurredAt,
          categoryId: moneyTransaction.categoryId,
          merchantId: moneyTransaction.merchantId,
          notes: moneyTransaction.notes,
        })
        .from(moneyTransaction)
        .where(eq(moneyTransaction.workspaceId, workspaceId))
        .limit(limit);
      return rows.map((r) => ({
        accountId: r.accountId,
        kind: r.kind,
        amountMinor: r.amountMinor,
        occurredAt:
          r.occurredAt instanceof Date
            ? r.occurredAt.toISOString()
            : String(r.occurredAt ?? ""),
        categoryId: r.categoryId ?? "",
        merchantId: r.merchantId ?? "",
        notes: r.notes ?? "",
        tagNames: "",
        tagIds: "",
      }));
    }
    case "rules": {
      const rows = await db
        .select({
          name: moneyRule.name,
          kind: moneyRule.kind,
          priority: moneyRule.priority,
          active: moneyRule.active,
          match: moneyRule.match,
          action: moneyRule.action,
        })
        .from(moneyRule)
        .where(eq(moneyRule.workspaceId, workspaceId))
        .limit(limit);
      return rows.map((r) => {
        const match = (r.match ?? {}) as RuleMatch;
        const action = (r.action ?? {}) as RuleAction;
        return {
          name: r.name,
          kind: r.kind,
          priority: r.priority,
          active: Boolean(r.active),
          matchAccountId: match.accountId ?? "",
          matchMerchantId: match.merchantId ?? "",
          setCategoryId: action.setCategoryId ?? "",
          tagIds: Array.isArray(action.tagIds) ? action.tagIds.join(",") : "",
        };
      });
    }
    case "recurrence": {
      const rows = await db
        .select({
          name: moneyRecurrentTemplate.name,
          cadence: moneyRecurrentTemplate.cadence,
          nextRunAt: moneyRecurrentTemplate.nextRunAt,
          active: moneyRecurrentTemplate.active,
          template: moneyRecurrentTemplate.template,
        })
        .from(moneyRecurrentTemplate)
        .where(eq(moneyRecurrentTemplate.workspaceId, workspaceId))
        .limit(limit);
      return rows.map((r) => {
        const t = (r.template ?? {}) as RecurrentTemplate;
        return {
          name: r.name,
          templateAccountId: t.accountId ?? "",
          templateKind: t.kind ?? "",
          templateAmountMinor: t.amountMinor ?? "",
          templateCategoryId: t.categoryId ?? "",
          templateMerchantId: t.merchantId ?? "",
          templateNotes: t.notes ?? "",
          templateTagIds: Array.isArray(t.tagIds) ? t.tagIds.join(",") : "",
          templateTagNames: Array.isArray(t.tagNames)
            ? t.tagNames.join(",")
            : "",
          cadence: r.cadence,
          nextRunAt:
            r.nextRunAt instanceof Date
              ? r.nextRunAt.toISOString()
              : String(r.nextRunAt ?? ""),
          active: Boolean(r.active),
        };
      });
    }
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}

export async function exportMoneyKindCsv(
  workspaceId: string,
  kind: MoneyImportKind,
): Promise<Response> {
  const rows = await loadMoneyExportRows(workspaceId, kind);
  return buildMoneyExportResponse(kind, rows);
}

/** ZIP of all Money kinds; fails whole request if any kind exceeds caps. */
export async function exportMoneyAllZip(
  workspaceId: string,
): Promise<Response> {
  const encoder = new TextEncoder();
  const zipEntries: { name: string; data: Uint8Array }[] = [];
  for (const kind of MONEY_IMPORT_ALL_ORDER) {
    const rows = await loadMoneyExportRows(workspaceId, kind);
    if (rows.length > MONEY_EXPORT_MAX_ROWS) {
      return exportTooLargeResponse(
        `Export exceeds max rows (${MONEY_EXPORT_MAX_ROWS}) for ${kind}.`,
      );
    }
    const csv = moneyExportCsv(kind, rows);
    const bytes = encoder.encode(csv).byteLength;
    if (bytes > MONEY_EXPORT_MAX_BYTES) {
      return exportTooLargeResponse(
        `Export exceeds max bytes (${MONEY_EXPORT_MAX_BYTES}) for ${kind}.`,
      );
    }
    zipEntries.push({ name: `${kind}.csv`, data: encoder.encode(csv) });
  }
  return zipResponse("money-export-all.zip", buildZip(zipEntries));
}

/** Build ZIP from preloaded per-kind row maps (unit tests / caps). */
export function buildMoneyExportAllResponse(
  byKind: Partial<Record<MoneyImportKind, Record<string, unknown>[]>>,
): Response {
  const encoder = new TextEncoder();
  const zipEntries: { name: string; data: Uint8Array }[] = [];
  for (const kind of MONEY_IMPORT_ALL_ORDER) {
    const rows = byKind[kind] ?? [];
    if (rows.length > MONEY_EXPORT_MAX_ROWS) {
      return exportTooLargeResponse(
        `Export exceeds max rows (${MONEY_EXPORT_MAX_ROWS}) for ${kind}.`,
      );
    }
    const csv = moneyExportCsv(kind, rows);
    const bytes = encoder.encode(csv).byteLength;
    if (bytes > MONEY_EXPORT_MAX_BYTES) {
      return exportTooLargeResponse(
        `Export exceeds max bytes (${MONEY_EXPORT_MAX_BYTES}) for ${kind}.`,
      );
    }
    zipEntries.push({ name: `${kind}.csv`, data: encoder.encode(csv) });
  }
  return zipResponse("money-export-all.zip", buildZip(zipEntries));
}
