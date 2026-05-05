import type { MoneyCategoryRow } from "@/lib/money-category-ui";
import {
  accountsAuxiliaryTypeColumnHeaders,
  resolveAccountsTypeEnumForImport,
  resolveBoolForImportOptional,
  resolveEnumForImport,
} from "@/lib/money-import-value-map";
import type { MoneyImportFieldDef, MoneyImportKind } from "@/lib/money-import-kinds";
import { moneyImportFieldDefs } from "@/lib/money-import-kinds";
import {
  buildFkIdByCsvMap,
  resolveFkValue,
  valuePicksToEnumBoolMap,
  type MoneyImportValuePick,
} from "@/lib/money-import-value-picks";
import {
  normalizeIsoDateTime,
  parseIntCell,
  parseMoneyMinor,
  parseUuidList,
  splitList,
} from "@/lib/money-import-resolve";
import {
  accountCreateSchema,
  budgetCreateSchema,
  categoryCreateSchema,
  merchantCreateSchema,
  recurrentCreateSchema,
  ruleCreateSchema,
  tagCreateSchema,
  transactionCreateSchema,
} from "@/lib/validators/money";

export type MoneyCsvImportFkContext = {
  accounts: { id: string; name: string }[];
  merchants: { id: string; name: string }[];
  categories: MoneyCategoryRow[];
};

function cell(
  row: Record<string, string>,
  columnByField: Record<string, string>,
  key: string,
): string {
  const col = columnByField[key] ?? "";
  if (!col) return "";
  return String(row[col] ?? "").trim();
}

function enumMapFromPicks(
  f: MoneyImportFieldDef,
  picks: Record<string, MoneyImportValuePick> | undefined,
): Record<string, string> {
  return valuePicksToEnumBoolMap(picks, f.enumValues);
}

export function buildMoneyCsvImportRows(
  kind: MoneyImportKind,
  csvRows: Record<string, string>[],
  columnByField: Record<string, string>,
  headers: readonly string[],
  valuePicksByField: Record<string, Record<string, MoneyImportValuePick>>,
  fkCtx: MoneyCsvImportFkContext,
  createdIdByCsvByField: Record<string, Map<string, string>>,
): { rows: unknown[]; errors: { rowNumber: number; message: string }[] } {
  const defs = moneyImportFieldDefs(kind);
  const errors: { rowNumber: number; message: string }[] = [];
  const rows: unknown[] = [];

  const fkMaps: Record<string, Map<string, string>> = {};
  for (const f of defs) {
    if (!f.fk) continue;
    fkMaps[f.key] = buildFkIdByCsvMap(
      valuePicksByField[f.key],
      createdIdByCsvByField[f.key] ?? new Map(),
    );
  }

  const pushErr = (i: number, msg: string) => {
    errors.push({ rowNumber: i + 2, message: msg });
  };

  for (let i = 0; i < csvRows.length; i++) {
    const row = csvRows[i]!;
    try {
      const built = buildOneRow(
        kind,
        row,
        defs,
        columnByField,
        headers,
        valuePicksByField,
        fkCtx,
        fkMaps,
      );
      if (built === null) {
        pushErr(i, "Row skipped (missing required fields)");
        continue;
      }
      const validated = validateBuiltRow(kind, built);
      if (!validated.ok) {
        pushErr(i, validated.message);
        continue;
      }
      rows.push(validated.value);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid row";
      pushErr(i, msg);
    }
  }

  return { rows, errors };
}

function buildOneRow(
  kind: MoneyImportKind,
  row: Record<string, string>,
  defs: MoneyImportFieldDef[],
  columnByField: Record<string, string>,
  headers: readonly string[],
  valuePicksByField: Record<string, Record<string, MoneyImportValuePick>>,
  fkCtx: MoneyCsvImportFkContext,
  fkMaps: Record<string, Map<string, string>>,
): unknown | null {
  const g = (k: string) => cell(row, columnByField, k);

  switch (kind) {
    case "accounts": {
      const name = g("name");
      if (!name) return null;
      const typeCol = columnByField.type ?? "";
      const nameCol = columnByField.name ?? "";
      const aux = accountsAuxiliaryTypeColumnHeaders(headers, typeCol);
      const typeEnumMap = enumMapFromPicks(
        defs.find((d) => d.key === "type")!,
        valuePicksByField.type,
      );
      let type: string | undefined;
      if (typeCol || nameCol) {
        const t = resolveAccountsTypeEnumForImport(
          row,
          nameCol,
          typeCol,
          aux,
          "Type",
          [
            "checking",
            "savings",
            "cash",
            "credit",
            "loan",
            "investment",
            "other",
          ],
          typeEnumMap,
        );
        type = t || undefined;
      }
      const fBal = defs.find((d) => d.key === "balanceMinor");
      const balRaw = g("balanceMinor");
      const balanceMinor =
        balRaw === ""
          ? undefined
          : parseMoneyMinor(balRaw, Boolean(fBal?.allowMajorUnit)) ?? 0;
      const sortRaw = g("sortOrder");
      const sortOrder = sortRaw === "" ? undefined : parseIntCell(sortRaw);
      const archRaw = g("archived");
      const archived =
        archRaw === ""
          ? undefined
          : resolveBoolForImportOptional(
              archRaw,
              "Archived",
              enumMapFromPicks(defs.find((d) => d.key === "archived")!, valuePicksByField.archived),
            );
      return {
        name,
        type,
        currency: g("currency") || undefined,
        institution: g("institution") || null,
        balanceMinor,
        sortOrder,
        archived,
      };
    }
    case "categories": {
      const name = g("name");
      if (!name) return null;
      const fParent = defs.find((d) => d.key === "parentId")!;
      const parentRaw = g("parentId");
      let parentId: string | null | undefined;
      if (parentRaw) {
        parentId = resolveFkValue(
          fParent,
          parentRaw,
          valuePicksByField.parentId,
          fkMaps.parentId ?? new Map(),
          fkCtx,
        ) as string | null | undefined;
      } else {
        parentId = null;
      }
      const archRaw = g("archived");
      const archived =
        archRaw === ""
          ? undefined
          : resolveBoolForImportOptional(
              archRaw,
              "Archived",
              enumMapFromPicks(defs.find((d) => d.key === "archived")!, valuePicksByField.archived),
            );
      return { name, parentId: parentId ?? null, archived };
    }
    case "merchants":
      return {
        name: g("name"),
        normalizedName: g("normalizedName") || null,
      };
    case "tags":
      return {
        name: g("name"),
        color: g("color") || null,
      };
    case "budgets": {
      const fCat = defs.find((d) => d.key === "categoryId")!;
      const catRaw = g("categoryId");
      let categoryId: string | null | undefined = null;
      if (catRaw) {
        categoryId = resolveFkValue(
          fCat,
          catRaw,
          valuePicksByField.categoryId,
          fkMaps.categoryId ?? new Map(),
          fkCtx,
        ) as string | null | undefined;
      }
      return {
        categoryId: categoryId ?? null,
        periodStart: normalizeIsoDateTime(g("periodStart")),
        periodEnd: normalizeIsoDateTime(g("periodEnd")),
        limitAmountMinor: parseMoneyMinor(
          g("limitAmountMinor"),
          true,
        ) as number,
        currency: g("currency") || undefined,
      };
    }
    case "transactions": {
      const fAcc = defs.find((d) => d.key === "accountId")!;
      const accountId = resolveFkValue(
        fAcc,
        g("accountId"),
        valuePicksByField.accountId,
        fkMaps.accountId ?? new Map(),
        fkCtx,
      ) as string;
      const fKind = defs.find((d) => d.key === "kind")!;
      const kindRaw = g("kind");
      let txKind: string | undefined;
      if (kindRaw) {
        txKind = resolveEnumForImport(
          kindRaw,
          fKind.label,
          ["expense", "income", "transfer"],
          enumMapFromPicks(fKind, valuePicksByField.kind),
        );
      }
      const amountMinor = parseMoneyMinor(g("amountMinor"), true) as number;
      const occRaw = g("occurredAt");
      const fCat = defs.find((d) => d.key === "categoryId")!;
      const catRaw = g("categoryId");
      let categoryId: string | null | undefined;
      if (catRaw) {
        categoryId = resolveFkValue(
          fCat,
          catRaw,
          valuePicksByField.categoryId,
          fkMaps.categoryId ?? new Map(),
          fkCtx,
        ) as string | null | undefined;
      } else {
        categoryId = null;
      }
      const fMer = defs.find((d) => d.key === "merchantId")!;
      const merRaw = g("merchantId");
      let merchantId: string | null | undefined;
      if (merRaw) {
        merchantId = resolveFkValue(
          fMer,
          merRaw,
          valuePicksByField.merchantId,
          fkMaps.merchantId ?? new Map(),
          fkCtx,
        ) as string | null | undefined;
      } else {
        merchantId = null;
      }
      const tagIdsRaw = g("tagIds");
      const tagNamesRaw = g("tagNames");
      return {
        accountId,
        kind: (txKind ?? "expense") as "expense" | "income" | "transfer",
        amountMinor,
        occurredAt: occRaw ? normalizeIsoDateTime(occRaw) : undefined,
        categoryId: categoryId ?? null,
        merchantId: merchantId ?? null,
        notes: g("notes") || null,
        tagIds: tagIdsRaw ? parseUuidList(tagIdsRaw) : undefined,
        tagNames: tagNamesRaw ? splitList(tagNamesRaw) : undefined,
      };
    }
    case "rules": {
      const name = g("name");
      if (!name) return null;
      const fMa = defs.find((d) => d.key === "matchAccountId")!;
      const fMm = defs.find((d) => d.key === "matchMerchantId")!;
      const maRaw = g("matchAccountId");
      const mmRaw = g("matchMerchantId");
      let matchAccountId: string | undefined;
      let matchMerchantId: string | undefined;
      if (maRaw) {
        const id = resolveFkValue(
          fMa,
          maRaw,
          valuePicksByField.matchAccountId,
          fkMaps.matchAccountId ?? new Map(),
          fkCtx,
        );
        if (id) matchAccountId = id;
      }
      if (mmRaw) {
        const id = resolveFkValue(
          fMm,
          mmRaw,
          valuePicksByField.matchMerchantId,
          fkMaps.matchMerchantId ?? new Map(),
          fkCtx,
        );
        if (id) matchMerchantId = id;
      }
      const fSet = defs.find((d) => d.key === "setCategoryId")!;
      const setRaw = g("setCategoryId");
      let setCategoryId: string | undefined;
      if (setRaw) {
        const id = resolveFkValue(
          fSet,
          setRaw,
          valuePicksByField.setCategoryId,
          fkMaps.setCategoryId ?? new Map(),
          fkCtx,
        );
        if (id) setCategoryId = id;
      }
      const tagIdsRaw = g("tagIds");
      const priRaw = g("priority");
      const actRaw = g("active");
      return {
        name,
        priority: priRaw === "" ? undefined : parseIntCell(priRaw),
        active:
          actRaw === ""
            ? undefined
            : resolveBoolForImportOptional(
                actRaw,
                "Active",
                enumMapFromPicks(defs.find((d) => d.key === "active")!, valuePicksByField.active),
              ),
        match: {
          accountId: matchAccountId,
          merchantId: matchMerchantId,
        },
        action: {
          setCategoryId,
          tagIds: tagIdsRaw ? parseUuidList(tagIdsRaw) : undefined,
        },
      };
    }
    case "recurrence": {
      const name = g("name");
      if (!name) return null;
      const fAcc = defs.find((d) => d.key === "templateAccountId")!;
      const accountId = resolveFkValue(
        fAcc,
        g("templateAccountId"),
        valuePicksByField.templateAccountId,
        fkMaps.templateAccountId ?? new Map(),
        fkCtx,
      ) as string;
      const fKind = defs.find((d) => d.key === "templateKind")!;
      const tk = resolveEnumForImport(
        g("templateKind"),
        fKind.label,
        ["expense", "income", "transfer"],
        enumMapFromPicks(fKind, valuePicksByField.templateKind),
      ) as "expense" | "income" | "transfer";
      const amountMinor = parseMoneyMinor(g("templateAmountMinor"), true) as number;
      const fCat = defs.find((d) => d.key === "templateCategoryId")!;
      const catRaw = g("templateCategoryId");
      let categoryId: string | null | undefined;
      if (catRaw) {
        categoryId = resolveFkValue(
          fCat,
          catRaw,
          valuePicksByField.templateCategoryId,
          fkMaps.templateCategoryId ?? new Map(),
          fkCtx,
        ) as string | null | undefined;
      } else {
        categoryId = null;
      }
      const fMer = defs.find((d) => d.key === "templateMerchantId")!;
      const merRaw = g("templateMerchantId");
      let merchantId: string | null | undefined;
      if (merRaw) {
        merchantId = resolveFkValue(
          fMer,
          merRaw,
          valuePicksByField.templateMerchantId,
          fkMaps.templateMerchantId ?? new Map(),
          fkCtx,
        ) as string | null | undefined;
      } else {
        merchantId = null;
      }
      const fCad = defs.find((d) => d.key === "cadence")!;
      const cadence = resolveEnumForImport(
        g("cadence"),
        fCad.label,
        ["weekly", "biweekly", "monthly", "quarterly", "yearly"],
        enumMapFromPicks(fCad, valuePicksByField.cadence),
      ) as "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
      const tagIdsRaw = g("templateTagIds");
      const actRaw = g("active");
      return {
        name,
        cadence,
        nextRunAt: normalizeIsoDateTime(g("nextRunAt")),
        active:
          actRaw === ""
            ? undefined
            : resolveBoolForImportOptional(
                actRaw,
                "Active",
                enumMapFromPicks(defs.find((d) => d.key === "active")!, valuePicksByField.active),
              ),
        template: {
          accountId,
          kind: tk,
          amountMinor,
          categoryId: categoryId ?? null,
          merchantId: merchantId ?? null,
          notes: g("templateNotes") || null,
          tagIds: tagIdsRaw ? parseUuidList(tagIdsRaw) : undefined,
        },
      };
    }
    default: {
      const _k: never = kind;
      return _k;
    }
  }
}

function validateBuiltRow(
  kind: MoneyImportKind,
  built: unknown,
): { ok: true; value: unknown } | { ok: false; message: string } {
  switch (kind) {
    case "accounts": {
      const p = accountCreateSchema.safeParse(built);
      return p.success ? { ok: true, value: p.data } : { ok: false, message: p.error.message };
    }
    case "categories": {
      const p = categoryCreateSchema.safeParse(built);
      return p.success ? { ok: true, value: p.data } : { ok: false, message: p.error.message };
    }
    case "merchants": {
      const p = merchantCreateSchema.safeParse(built);
      return p.success ? { ok: true, value: p.data } : { ok: false, message: p.error.message };
    }
    case "tags": {
      const p = tagCreateSchema.safeParse(built);
      return p.success ? { ok: true, value: p.data } : { ok: false, message: p.error.message };
    }
    case "budgets": {
      const p = budgetCreateSchema.safeParse(built);
      return p.success ? { ok: true, value: p.data } : { ok: false, message: p.error.message };
    }
    case "transactions": {
      const p = transactionCreateSchema.safeParse(built);
      return p.success ? { ok: true, value: p.data } : { ok: false, message: p.error.message };
    }
    case "rules": {
      const p = ruleCreateSchema.safeParse(built);
      return p.success ? { ok: true, value: p.data } : { ok: false, message: p.error.message };
    }
    case "recurrence": {
      const p = recurrentCreateSchema.safeParse(built);
      return p.success ? { ok: true, value: p.data } : { ok: false, message: p.error.message };
    }
    default: {
      const _k: never = kind;
      return _k;
    }
  }
}
