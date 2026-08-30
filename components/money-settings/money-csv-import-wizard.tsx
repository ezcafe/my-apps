"use client";

import { toUserFacingMessage } from "@/lib/user-facing-error";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MoneyUsageQuickPick } from "@/components/money-usage-quick-pick";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { moneyQuickPickChipCls, moneyQuickPickGroupCls } from "@/lib/money-quick-pick-chip-cls";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { MoneyStatusEmphasis, MoneyStatusStrip } from "@/lib/money-status-strip";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import type { UsageRankedItem } from "@/lib/money-usage-quick-pick";
import {
  MONEY_ACCOUNT_CREATE_MUTATION,
  MONEY_CATEGORY_CREATE_MUTATION,
  MONEY_LIST_ACCOUNTS_QUERY,
  MONEY_LIST_CATEGORIES_QUERY,
  MONEY_LIST_MERCHANTS_QUERY,
  MONEY_LIST_TAGS_QUERY,
  MONEY_MERCHANT_CREATE_MUTATION,
  MONEY_PARSE_CSV_QUERY,
} from "@/lib/money-gql-documents";
import {
  fkAllRowsForField,
  fkCategoryGroupsForField,
  type FkEntityRow,
} from "@/lib/money-import-fk-synonym";
import {
  MONEY_IMPORT_ACCOUNT_TYPES,
  moneyImportApiPath,
  moneyImportFieldDefs,
  moneyImportSectionTitle,
  type MoneyImportKind,
} from "@/lib/money-import-kinds";
import {
  buildCategoryImportParentPicksPerRow,
  buildInitialValuePickByField,
  categoryImportParentPickKey,
  categoryImportParentPickSatisfies,
  effectiveEnumBoolSelectForRow,
  effectiveFkSelectForRow,
  enumBoolPickSatisfiesImport,
  fkPickSatisfiesImport,
  mergeMatchValueRowKeys,
  pruneAndAutoFillEnumBoolPicks,
  pruneAndAutoFillFkPicks,
  VALUE_PICK_CATEGORY_PARENT_TOP,
  VALUE_PICK_SELECT_ADD_NEW,
  VALUE_PICK_SELECT_CATEGORY_IMPORT_PARENT_TOP,
  VALUE_PICK_SELECT_IGNORE,
  type MoneyImportAccountType,
  type MoneyImportValuePick,
} from "@/lib/money-import-value-picks";
import {
  includeMoneyImportValueMappingColumn,
  listDistinctForMoneyImportField,
} from "@/lib/money-import-value-map";
import { buildMoneyCsvImportRows } from "@/lib/money-csv-import-rows";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";

type WizardStep = "type" | "upload" | "map" | "review";

type AccountRow = { id: string; name: string };
type MerchantRow = { id: string; name: string };
type TagRow = { id: string; name: string };

const KINDS_ORDER = [
  "accounts",
  "categories",
  "merchants",
  "tags",
  "budgets",
  "transactions",
  "rules",
  "recurrence",
] as const satisfies readonly MoneyImportKind[];

const STEP_ORDER: WizardStep[] = ["type", "upload", "map", "review"];

const STEP_META: Record<
  WizardStep,
  { title: string; hint: string }
> = {
  type: {
    title: "Import type",
    hint: "What are you bringing in? Pick the list that matches your file.",
  },
  upload: {
    title: "Upload",
    hint: "Use a CSV with a header row. We’ll suggest column matches next.",
  },
  map: {
    title: "Map",
    hint: "Match columns, then fix any values we couldn’t recognize.",
  },
  review: {
    title: "Review",
    hint: "Check the summary below, then import.",
  },
};

function toCsvCell(value: string): string {
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) {
    v = `'${v}`;
  }
  if (/[",\n\r]/.test(v)) {
    return `"${v.replaceAll('"', '""')}"`;
  }
  return v;
}

function toCsvErrorSummary(rawMessage: string): string {
  const esc = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
  const issueToSingleQuoteText = (issue: { code: string; message: string }) =>
    `{'code':'${esc(issue.code)}','message':'${esc(issue.message)}'}`;
  try {
    const parsed: unknown = JSON.parse(rawMessage);
    if (!Array.isArray(parsed)) return rawMessage;
    const slim = parsed
      .filter((item): item is { code?: unknown; message?: unknown } => Boolean(item))
      .map((item) => ({
        code: typeof item.code === "string" ? item.code : "unknown",
        message: typeof item.message === "string" ? item.message : rawMessage,
      }));
    if (slim.length === 0) return rawMessage;
    if (slim.length === 1) return issueToSingleQuoteText(slim[0]!);
    return slim.map(issueToSingleQuoteText).join(" | ");
  } catch {
    return rawMessage;
  }
}

function parseImportErrorMessages(rawMessage: string): string[] {
  try {
    const parsed: unknown = JSON.parse(rawMessage);
    if (!Array.isArray(parsed)) return [rawMessage];
    const messages = parsed
      .filter((item): item is { message?: unknown } => Boolean(item))
      .map((item) =>
        typeof item.message === "string" ? item.message : rawMessage,
      )
      .filter(Boolean);
    return messages.length > 0 ? messages : [rawMessage];
  } catch {
    return [rawMessage];
  }
}

function requiredColumnsProgress(
  kind: MoneyImportKind,
  columnByField: Record<string, string>,
): { mapped: number; total: number } {
  let mapped = 0;
  let total = 0;
  for (const f of moneyImportFieldDefs(kind)) {
    if (!f.required) continue;
    total += 1;
    if ((columnByField[f.key] ?? "").trim()) mapped += 1;
  }
  return { mapped, total };
}

function missingRequiredFieldLabels(
  kind: MoneyImportKind,
  columnByField: Record<string, string>,
): string[] {
  return moneyImportFieldDefs(kind)
    .filter((f) => f.required && !(columnByField[f.key] ?? "").trim())
    .map((f) => f.label);
}

function formatImportPreviewCell(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim() || "—";
  return String(value);
}

function ImportTypeChevron() {
  return (
    <svg
      className="size-5 flex-none text-muted"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const FK_CATEGORY_OPTGROUP_LABEL: Record<"expense" | "income", string> = {
  expense: "Expense categories",
  income: "Income categories",
};

function fkEntityQuickItems(
  entities: FkEntityRow[],
  categoryGroups: { kind: "expense" | "income"; rows: FkEntityRow[] }[] | null,
): UsageRankedItem[] {
  if (categoryGroups) {
    return categoryGroups.flatMap((g) =>
      g.rows.map((e) => ({
        id: e.id,
        label: `${FK_CATEGORY_OPTGROUP_LABEL[g.kind]} · ${e.name}`,
        usageCount: 0,
      })),
    );
  }
  return entities.map((e) => ({
    id: e.id,
    label: e.name,
    usageCount: 0,
  }));
}

function CsvFkQuickPick({
  selectedId,
  onSelect,
  entities,
  categoryGroups,
  emptyLabel,
  extraItems = [],
  ariaLabel = "Map value",
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  entities: FkEntityRow[];
  categoryGroups: { kind: "expense" | "income"; rows: FkEntityRow[] }[] | null;
  emptyLabel: string;
  extraItems?: readonly { id: string; label: string }[];
  ariaLabel?: string;
}) {
  const items = useMemo(
    () => fkEntityQuickItems(entities, categoryGroups),
    [entities, categoryGroups],
  );
  const pickerItems = useMemo(
    () => [
      ...extraItems.map((x) => ({
        id: x.id,
        label: x.label,
        usageCount: 0,
      })),
      ...items,
    ],
    [extraItems, items],
  );

  return (
    <MoneyUsageQuickPick
      legend=""
      hideLegend
      compact
      ariaLabel={ariaLabel}
      items={items}
      pickerItems={pickerItems}
      selectedId={selectedId}
      onSelect={onSelect}
      otherLabel="Choose…"
      allowEmpty
      emptyLabel={emptyLabel}
      emptySelectedOnOther={selectedId === ""}
      emptyMessage="No options"
    />
  );
}

function MapArrowIcon() {
  return (
    <svg
      className="size-4 shrink-0 text-muted"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06l2.97-2.97H2.75a.75.75 0 0 1 0-1.5h8.44L8.22 4.03a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ImportProgress({
  current,
  onStepClick,
}: {
  current: WizardStep;
  onStepClick: (s: WizardStep) => void;
}) {
  const currentIdx = STEP_ORDER.indexOf(current);
  const progressPct = ((currentIdx + 1) / STEP_ORDER.length) * 100;
  return (
    <nav aria-label="Import steps" className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Step {currentIdx + 1} of {STEP_ORDER.length}
        </span>
        <span className="font-medium text-foreground">
          {STEP_META[current].title}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <p className="text-sm text-muted">{STEP_META[current].hint}</p>
      <div
        role="radiogroup"
        aria-label="Import steps"
        className={moneyQuickPickGroupCls}
      >
        {STEP_ORDER.map((id, i) => {
          const done = i < currentIdx;
          const active = id === current;
          const future = i > currentIdx;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-current={active ? "step" : undefined}
              disabled={future}
              onClick={() => {
                if (!future && i !== currentIdx) onStepClick(id);
              }}
              className={cn(
                moneyQuickPickChipCls(active),
                "disabled:cursor-not-allowed disabled:opacity-45",
                done && !active ? "text-foreground" : null,
              )}
            >
              {STEP_META[id].title}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function guessColumnMap(headers: string[], kind: MoneyImportKind): Record<string, string> {
  const defs = moneyImportFieldDefs(kind);
  const byLower = new Map(headers.map((h) => [h.trim().toLowerCase(), h]));
  const toSnake = (camel: string) =>
    camel.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`).replace(/^_/, "");
  const out: Record<string, string> = {};
  for (const d of defs) {
    const candidates = [
      d.key.toLowerCase(),
      toSnake(d.key),
      d.label.toLowerCase(),
      d.label.toLowerCase().replace(/\s+/g, " "),
      d.label.toLowerCase().replace(/\s+/g, "_"),
    ];
    for (const c of candidates) {
      const hit = byLower.get(c);
      if (hit) {
        out[d.key] = hit;
        break;
      }
    }
  }
  return out;
}

function buildColumnByFieldFromCsvMapping(
  headers: readonly string[],
  dbFieldByCsvCol: Record<string, string>,
  kind: MoneyImportKind,
): Record<string, string> {
  const defs = moneyImportFieldDefs(kind);
  const out: Record<string, string> = {};
  for (const d of defs) {
    for (const h of headers) {
      if (dbFieldByCsvCol[h] === d.key) {
        out[d.key] = h;
        break;
      }
    }
  }
  return out;
}

function initialDbFieldByCsvCol(
  headers: readonly string[],
  columnByField: Record<string, string>,
): Record<string, string> {
  const inv: Record<string, string> = {};
  for (const [fieldKey, col] of Object.entries(columnByField)) {
    if (col.trim()) inv[col] = fieldKey;
  }
  const out: Record<string, string> = {};
  for (const h of headers) {
    out[h] = inv[h] ?? "";
  }
  return out;
}

function setDbFieldForColumn(
  prev: Record<string, string>,
  header: string,
  fieldKey: string,
  allHeaders: readonly string[],
): Record<string, string> {
  const next = { ...prev, [header]: fieldKey };
  if (!fieldKey) return next;
  for (const h of allHeaders) {
    if (h !== header && next[h] === fieldKey) {
      next[h] = "";
    }
  }
  return next;
}

function allRequiredColumnsMapped(
  kind: MoneyImportKind,
  columnByField: Record<string, string>,
): boolean {
  for (const f of moneyImportFieldDefs(kind)) {
    if (!f.required) continue;
    const col = columnByField[f.key] ?? "";
    if (!col.trim()) return false;
  }
  return true;
}

function categoryKindForCategoriesImportRow(
  csvKey: string,
  parsedRows: Record<string, string>[],
  columnByField: Record<string, string>,
): "expense" | "income" {
  const m = csvKey.match(/^__import_row_(\d+)$/);
  if (!m) return "expense";
  const rowIdx = Number(m[1]);
  const col = columnByField.kind ?? "";
  if (!col) return "expense";
  const v = String(parsedRows[rowIdx]?.[col] ?? "")
    .trim()
    .toLowerCase();
  return v === "income" ? "income" : "expense";
}

function categoryKindForLeafPick(
  parentCategoryId: string | null | undefined,
  categories: MoneyCategoryRow[],
): "expense" | "income" {
  if (!parentCategoryId) return "expense";
  const parent = categories.find((c) => c.id === parentCategoryId);
  return parent?.kind ?? "expense";
}

async function createPendingNewEntities(
  defs: ReturnType<typeof moneyImportFieldDefs>,
  valuePicksByField: Record<string, Record<string, MoneyImportValuePick>>,
  context: {
    importKind: MoneyImportKind;
    parsedRows: Record<string, string>[];
    columnByField: Record<string, string>;
    categories: MoneyCategoryRow[];
  },
): Promise<Record<string, Map<string, string>>> {
  const out: Record<string, Map<string, string>> = {};
  for (const f of defs) {
    if (!f.fk) continue;
    const picks = valuePicksByField[f.key];
    if (!picks) continue;
    const map = new Map<string, string>();
    for (const [csvKey, p] of Object.entries(picks)) {
      if (p.kind !== "new") continue;
      const name = p.name.trim();
      if (!name) throw new Error(`${f.label}: name required for new ${f.fk}`);

      if (f.fk === "account") {
        const row = await moneyGraphQLRequest<{ moneyAccountCreate: { id: string } }>(
          MONEY_ACCOUNT_CREATE_MUTATION,
          {
            input: {
              name,
              type: p.accountType ?? "other",
            },
          },
        );
        map.set(csvKey, row.moneyAccountCreate.id);
      } else if (f.fk === "merchant") {
        const row = await moneyGraphQLRequest<{ moneyMerchantCreate: { id: string } }>(
          MONEY_MERCHANT_CREATE_MUTATION,
          { input: { name } },
        );
        map.set(csvKey, row.moneyMerchantCreate.id);
      } else if (f.fk === "category_root") {
        const k =
          context.importKind === "categories"
            ? categoryKindForCategoriesImportRow(
                csvKey,
                context.parsedRows,
                context.columnByField,
              )
            : "expense";
        const row = await moneyGraphQLRequest<{ moneyCategoryCreate: { id: string } }>(
          MONEY_CATEGORY_CREATE_MUTATION,
          { input: { name, kind: k, parentId: null } },
        );
        map.set(csvKey, row.moneyCategoryCreate.id);
      } else if (f.fk === "category_leaf") {
        if (p.parentCategoryId === undefined) {
          throw new Error(`${f.label}: choose parent or top category for "${csvKey}"`);
        }
        const k = categoryKindForLeafPick(p.parentCategoryId, context.categories);
        const row = await moneyGraphQLRequest<{ moneyCategoryCreate: { id: string } }>(
          MONEY_CATEGORY_CREATE_MUTATION,
          {
            input: {
              name,
              kind: k,
              parentId: p.parentCategoryId,
            },
          },
        );
        map.set(csvKey, row.moneyCategoryCreate.id);
      }
    }
    if (map.size > 0) out[f.key] = map;
  }
  return out;
}

export function MoneyCsvImportWizard({
  initialKind,
}: {
  initialKind?: MoneyImportKind;
}) {
  const notify = useNotify();
  const [kind, setKind] = useState<MoneyImportKind | null>(initialKind ?? null);
  const [step, setStep] = useState<WizardStep>(() => (initialKind ? "upload" : "type"));

  const [csvFileName, setCsvFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [dbFieldByCsvCol, setDbFieldByCsvCol] = useState<Record<string, string>>({});
  const [valuePicksByField, setValuePicksByField] = useState<
    Record<string, Record<string, MoneyImportValuePick>>
  >({});
  const [busy, setBusy] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [categories, setCategories] = useState<MoneyCategoryRow[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [preview, setPreview] = useState<{
    rows: unknown[];
    errors: { rowNumber: number; message: string }[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, m, c, t] = await Promise.all([
          moneyGraphQLRequest<{ moneyAccounts: AccountRow[] }>(MONEY_LIST_ACCOUNTS_QUERY),
          moneyGraphQLRequest<{ moneyMerchants: MerchantRow[] }>(MONEY_LIST_MERCHANTS_QUERY),
          moneyGraphQLRequest<{ moneyCategories: MoneyCategoryRow[] }>(
            MONEY_LIST_CATEGORIES_QUERY,
          ),
          moneyGraphQLRequest<{ moneyTags: TagRow[] }>(MONEY_LIST_TAGS_QUERY),
        ]);
        if (cancelled) return;
        setAccounts(a.moneyAccounts);
        setMerchants(m.moneyMerchants);
        setCategories(c.moneyCategories);
        setTags(t.moneyTags);
      } catch {
        if (!cancelled)
          notify.error("Could not load accounts, merchants, categories, or tags.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notify]);

  const [prevInitialKind, setPrevInitialKind] = useState(initialKind);
  if (initialKind !== prevInitialKind) {
    // React docs pattern for resetting state when a prop changes:
    // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    setPrevInitialKind(initialKind);
    setKind(initialKind ?? null);
    setStep(initialKind ? "upload" : "type");
  }

  const columnByField = useMemo(() => {
    if (!kind) return {};
    return buildColumnByFieldFromCsvMapping(headers, dbFieldByCsvCol, kind);
  }, [kind, headers, dbFieldByCsvCol]);

  const defs = useMemo(() => (kind ? moneyImportFieldDefs(kind) : []), [kind]);
  const txAllCategoryEntities = useMemo(
    () =>
      categories
        .filter((c) => !Boolean((c as MoneyCategoryRow & { archived?: boolean }).archived))
        .map((c) => ({ id: c.id, name: c.name })),
    [categories],
  );

  const valueFields = useMemo(() => {
    if (!kind) return [];
    return defs.filter((f) => {
      const col = columnByField[f.key] ?? "";
      if (!includeMoneyImportValueMappingColumn(kind, f, col)) return false;
      return f.valueKind === "enum" || f.valueKind === "bool" || Boolean(f.fk);
    });
  }, [defs, columnByField, kind]);

  const syncValuePicks = useCallback(() => {
    if (!kind || !parsedRows.length || !headers.length) return;
    setValuePicksByField((prev) => {
      const initial = buildInitialValuePickByField(
        kind,
        parsedRows,
        columnByField,
        headers,
        accounts,
        merchants,
        categories,
      );
      const next: Record<string, Record<string, MoneyImportValuePick>> = { ...initial };
      for (const f of defs) {
        const col = columnByField[f.key] ?? "";
        if (!includeMoneyImportValueMappingColumn(kind, f, col)) continue;
        if (kind === "categories" && f.key === "parentId" && f.fk) {
          const entities = fkAllRowsForField(f.fk, accounts, merchants, categories);
          next[f.key] = buildCategoryImportParentPicksPerRow(
            parsedRows,
            columnByField,
            prev[f.key],
            entities,
          );
          continue;
        }
        const distinct = listDistinctForMoneyImportField(
          kind,
          f,
          parsedRows,
          columnByField,
          headers,
          5000,
        );
        const mergedKeys = mergeMatchValueRowKeys(distinct, prev[f.key]);
        if (f.valueKind === "enum" || f.valueKind === "bool") {
          next[f.key] = pruneAndAutoFillEnumBoolPicks(f, mergedKeys, prev[f.key]);
        } else if (f.fk) {
          const entities =
            kind === "transactions" && f.key === "categoryId" && f.fk === "category_leaf"
              ? txAllCategoryEntities
              : fkAllRowsForField(f.fk, accounts, merchants, categories);
          next[f.key] = pruneAndAutoFillFkPicks(f, mergedKeys, entities, prev[f.key]);
        }
      }
      return next;
    });
  }, [
    kind,
    parsedRows,
    columnByField,
    headers,
    accounts,
    merchants,
    categories,
    defs,
    txAllCategoryEntities,
  ]);

  useEffect(() => {
    queueMicrotask(() => {
      syncValuePicks();
    });
  }, [syncValuePicks]);

  const rootCategories = useMemo(
    () => categories.filter((c) => c.parentId == null),
    [categories],
  );

  const distinctByFieldKey = useMemo(() => {
    if (!kind) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const f of valueFields) {
      const col = columnByField[f.key] ?? "";
      if (!includeMoneyImportValueMappingColumn(kind, f, col)) continue;
      if (kind === "categories" && f.key === "parentId") continue;
      map.set(
        f.key,
        listDistinctForMoneyImportField(
          kind,
          f,
          parsedRows,
          columnByField,
          headers,
          5000,
        ),
      );
    }
    return map;
  }, [kind, valueFields, columnByField, parsedRows, headers]);

  const unresolvedValueCount = useMemo(() => {
    if (!kind) return 0;
    let count = 0;
    for (const f of valueFields) {
      const col = columnByField[f.key] ?? "";
      if (!includeMoneyImportValueMappingColumn(kind, f, col)) continue;
      if (kind === "categories" && f.key === "parentId") {
        const nameCol = columnByField.name ?? "";
        for (let i = 0; i < parsedRows.length; i++) {
          const row = parsedRows[i]!;
          const catName = nameCol ? String(row[nameCol] ?? "").trim() : "";
          if (!catName) continue;
          const key = categoryImportParentPickKey(i);
          const pick = valuePicksByField.parentId?.[key];
          if (!categoryImportParentPickSatisfies(pick)) count += 1;
        }
        continue;
      }
      const distinct = distinctByFieldKey.get(f.key) ?? [];
      const keys = mergeMatchValueRowKeys(distinct, valuePicksByField[f.key]);
      const entities = f.fk
        ? kind === "transactions" && f.key === "categoryId" && f.fk === "category_leaf"
          ? txAllCategoryEntities
          : fkAllRowsForField(f.fk, accounts, merchants, categories)
        : [];
      for (const k of keys) {
        const pick = valuePicksByField[f.key]?.[k];
        if (f.valueKind === "enum" || f.valueKind === "bool") {
          if (!enumBoolPickSatisfiesImport(f, k, pick)) count += 1;
        } else if (f.fk) {
          if (!fkPickSatisfiesImport(f, k, pick, entities)) count += 1;
        }
      }
    }
    return count;
  }, [
    valueFields,
    columnByField,
    distinctByFieldKey,
    parsedRows,
    kind,
    valuePicksByField,
    accounts,
    merchants,
    categories,
    txAllCategoryEntities,
  ]);

  const valuesSatisfied = useMemo(
    () => (kind ? unresolvedValueCount === 0 : false),
    [kind, unresolvedValueCount],
  );

  const mapRequiredProgress = useMemo(
    () => (kind ? requiredColumnsProgress(kind, columnByField) : { mapped: 0, total: 0 }),
    [kind, columnByField],
  );

  const missingRequiredLabels = useMemo(
    () => (kind ? missingRequiredFieldLabels(kind, columnByField) : []),
    [kind, columnByField],
  );

  const reviewPreviewColumns = useMemo(() => {
    if (!kind) return [];
    return moneyImportFieldDefs(kind).filter(
      (f) => (columnByField[f.key] ?? "").trim().length > 0,
    );
  }, [kind, columnByField]);

  const refreshEntityLists = useCallback(async () => {
    const [a, m, c, t] = await Promise.all([
      moneyGraphQLRequest<{ moneyAccounts: AccountRow[] }>(MONEY_LIST_ACCOUNTS_QUERY),
      moneyGraphQLRequest<{ moneyMerchants: MerchantRow[] }>(MONEY_LIST_MERCHANTS_QUERY),
      moneyGraphQLRequest<{ moneyCategories: MoneyCategoryRow[] }>(
        MONEY_LIST_CATEGORIES_QUERY,
      ),
      moneyGraphQLRequest<{ moneyTags: TagRow[] }>(MONEY_LIST_TAGS_QUERY),
    ]);
    setAccounts(a.moneyAccounts);
    setMerchants(m.moneyMerchants);
    setCategories(c.moneyCategories);
    setTags(t.moneyTags);
    return {
      accounts: a.moneyAccounts,
      merchants: m.moneyMerchants,
      categories: c.moneyCategories,
      tags: t.moneyTags,
    };
  }, []);

  const runPreview = () => {
    if (!kind) return;
    const { rows, errors } = buildMoneyCsvImportRows(
      kind,
      parsedRows,
      columnByField,
      headers,
      valuePicksByField,
      { accounts, merchants, categories, tags },
      {},
    );
    setPreview({ rows, errors });
    setStep("review");
  };

  const resetWizard = () => {
    setCsvFileName("");
    setHeaders([]);
    setParsedRows([]);
    setDbFieldByCsvCol({});
    setValuePicksByField({});
    setPreview(null);
    setKind(initialKind ?? null);
    setStep(initialKind ? "upload" : "type");
  };

  const runImport = async () => {
    if (!preview?.rows.length || !kind) {
      notify.error("Nothing valid to import.");
      return;
    }
    setBusy("import");
    try {
      const createdMaps = await createPendingNewEntities(defs, valuePicksByField, {
        importKind: kind,
        parsedRows,
        columnByField,
        categories,
      });
      const fkCtx = await refreshEntityLists();
      const { rows } = buildMoneyCsvImportRows(
        kind,
        parsedRows,
        columnByField,
        headers,
        valuePicksByField,
        fkCtx,
        createdMaps,
      );
      if (rows.length === 0) {
        notify.error("Nothing valid to import after resolving new rows.");
        return;
      }
      const ir = await fetch(moneyImportApiPath(kind), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rows }),
      });
      const ibody = (await ir.json().catch(() => null)) as
        | { data?: { created: number } }
        | { error?: string }
        | null;
      if (!ir.ok) {
        throw new Error(
          ibody && "error" in ibody && ibody.error
            ? ibody.error
            : ir.statusText ?? "Import failed",
        );
      }
      const created =
        ibody && "data" in ibody && ibody.data?.created != null ? ibody.data.created : 0;
      notify.success(`Imported ${created} row(s).`);
      resetWizard();
    } catch (e: unknown) {
      notify.error(toUserFacingMessage(e, "Import failed"));
    } finally {
      setBusy(null);
    }
  };

  const handlePickKind = (k: MoneyImportKind) => {
    setKind(k);
    setStep("upload");
    setCsvFileName("");
    setHeaders([]);
    setParsedRows([]);
    setDbFieldByCsvCol({});
    setValuePicksByField({});
    setPreview(null);
  };

  const handleCsvFile = async (file: File | null) => {
    if (!file || !kind) return;
    setCsvFileName(file.name);
    setBusy("parse");
    try {
      const csvText = await file.text();
      const parsedCsv = await moneyGraphQLRequest<{
        moneyParseCsv: { headers: string[]; rows: Record<string, string>[] };
      }>(MONEY_PARSE_CSV_QUERY, { csv: csvText });
      const data = parsedCsv.moneyParseCsv;
      const hdrs = data.headers ?? [];
      const rows = data.rows ?? [];
      if (!hdrs.length || !rows.length) {
        notify.error("CSV must include a header row and at least one data row.");
        return;
      }
      const guessed = guessColumnMap(hdrs, kind);
      setHeaders(hdrs);
      setParsedRows(rows);
      setDbFieldByCsvCol(initialDbFieldByCsvCol(hdrs, guessed));
      setPreview(null);
      setStep("map");
      notify.success(`Loaded ${rows.length} row(s).`);
    } catch (e: unknown) {
      notify.error(toUserFacingMessage(e, "Parse failed"));
    } finally {
      setBusy(null);
    }
  };

  const goToStep = (s: WizardStep) => {
    const cur = STEP_ORDER.indexOf(step);
    const tgt = STEP_ORDER.indexOf(s);
    if (tgt >= cur) return;
    setStep(s);
    if (s !== "review") setPreview(null);
  };

  const firstRowSample = (csvColumn: string) =>
    parsedRows[0]?.[csvColumn] != null ? String(parsedRows[0]![csvColumn]) : "";

  const reviewSampleRows = preview?.rows.slice(0, 10) ?? [];
  const reviewErrorCsv = useMemo(() => {
    if (!preview?.errors.length || headers.length === 0) return "";
    const csvHeaders = [...headers, "error"];
    const lines = [csvHeaders.map((h) => toCsvCell(h)).join(",")];
    for (const err of preview.errors) {
      const row = parsedRows[err.rowNumber - 2] ?? {};
      const rowValues = headers.map((h) => toCsvCell(String(row[h] ?? "")));
      rowValues.push(toCsvCell(toCsvErrorSummary(err.message)));
      lines.push(rowValues.join(","));
    }
    return lines.join("\n");
  }, [headers, parsedRows, preview]);

  return (
    <div className={cn(MONEY_FULL_SPAN, "min-w-0")}>
      <ImportProgress current={step} onStepClick={goToStep} />

      {step === "type" ? (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-foreground">Choose import type</h3>
          <p className="mt-1 text-sm text-muted">
            Pick what you want to import. You can change this later from the progress steps.
          </p>
          <ul
            role="list"
            className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-px overflow-hidden rounded-[var(--radius-md)] bg-border shadow-[var(--shadow-sm)]"
            aria-label="Import types"
          >
            {KINDS_ORDER.map((k) => (
              <li key={k} className="min-w-0">
                <button
                  type="button"
                  onClick={() => handlePickKind(k)}
                  className="relative flex w-full items-center gap-x-3 bg-surface px-4 py-5 text-left text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--foreground)_5%,transparent)] focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground"
                >
                  <span className="min-w-0 flex-1">{moneyImportSectionTitle[k]}</span>
                  <ImportTypeChevron />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {step === "upload" && kind ? (
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-medium text-foreground">Upload CSV</h3>
          <p className="text-sm text-muted">
            Import type: <span className="font-medium text-foreground">{moneyImportSectionTitle[kind]}</span>
            . File must include a header row.
          </p>
          <Field label="CSV file">
            <Input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="cursor-pointer file:mr-3 file:cursor-pointer"
              disabled={busy !== null}
              onChange={(e) => void handleCsvFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          {csvFileName ? (
            <p className="text-sm text-muted">
              Selected: <span className="font-mono text-foreground">{csvFileName}</span>
            </p>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => setStep("type")}>
            Back
          </Button>
        </div>
      ) : null}

      {step === "map" && kind ? (
        <div className="mt-8 space-y-10">
          <MoneyStatusStrip>
            <MoneyStatusEmphasis>{parsedRows.length}</MoneyStatusEmphasis> rows ·{" "}
            <MoneyStatusEmphasis>
              {mapRequiredProgress.mapped}/{mapRequiredProgress.total}
            </MoneyStatusEmphasis>{" "}
            required columns
            {valueFields.length > 0 ? (
              <>
                {" "}
                ·{" "}
                {unresolvedValueCount > 0 ? (
                  <>
                    <MoneyStatusEmphasis>{unresolvedValueCount}</MoneyStatusEmphasis>{" "}
                    {unresolvedValueCount === 1 ? "value to fix" : "values to fix"}
                  </>
                ) : (
                  <span className="font-medium text-foreground">values ready</span>
                )}
              </>
            ) : null}
          </MoneyStatusStrip>

          <div>
            <h3 className="text-sm font-medium text-foreground">Match your file columns</h3>
            <p className="mt-1 text-sm text-muted">
              Sample values come from the first row of your file.
            </p>
            <div className="mt-3">
              <Table className="min-w-[32rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>CSV column</TableHead>
                    <TableHead className="w-10" aria-hidden>
                      {" "}
                    </TableHead>
                    <TableHead>Maps to</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headers.map((h) => {
                    const sample = firstRowSample(h);
                    return (
                      <TableRow key={h}>
                        <TableCell className="align-top">
                          <div className="font-medium text-foreground">{h}</div>
                          <div className="mt-1 max-w-xs truncate font-mono text-sm text-muted">
                            {sample || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="align-middle px-1">
                          <MapArrowIcon />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={dbFieldByCsvCol[h] ?? ""}
                            onChange={(e) =>
                              setDbFieldByCsvCol((prev) =>
                                setDbFieldForColumn(prev, h, e.target.value, headers),
                              )
                            }
                          >
                            <option value="">— Skip —</option>
                            {defs.map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.label}
                                {f.required ? " *" : ""}
                              </option>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {!allRequiredColumnsMapped(kind, columnByField) && missingRequiredLabels.length > 0 ? (
              <Alert
                variant="warning"
                className="mt-3"
                title="Required columns missing"
                description={
                  <>
                    Map{" "}
                    {missingRequiredLabels.map((label, i) => (
                      <span key={label}>
                        {i > 0 ? (i === missingRequiredLabels.length - 1 ? ", and " : ", ") : ""}
                        <span className="font-medium text-foreground">{label}</span>
                      </span>
                    ))}{" "}
                    to continue.
                  </>
                }
              />
            ) : null}
          </div>

          {valueFields.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Fix unrecognized values</h3>
              {valueFields.map((f) => {
                const entities =
                  f.fk != null
                    ? fkAllRowsForField(f.fk, accounts, merchants, categories)
                    : [];
                const txCategoryEntities =
                  kind === "transactions" && f.key === "categoryId" && f.fk === "category_leaf"
                    ? txAllCategoryEntities
                    : null;
                const entitiesForSelect = txCategoryEntities ?? entities;
                const categoryGroupsForSelect =
                  f.fk === "category_root" || f.fk === "category_leaf"
                    ? fkCategoryGroupsForField(categories, f.fk)
                    : null;
                const categoriesImportParentField =
                  kind === "categories" && f.key === "parentId";
                if (categoriesImportParentField && f.fk) {
                  const nameCol = columnByField.name ?? "";
                  const parentCol = columnByField.parentId ?? "";
                  return (
                    <div
                      key={f.key}
                      className="rounded-[var(--radius-md)] border border-border p-4"
                    >
                      <h4 className="text-sm font-semibold text-foreground">
                        {f.label}
                      </h4>
                      <p className="mt-1 text-sm text-muted">
                        One parent per imported row. CSV parent values are hints only; the
                        selection here is what gets imported. In the Parent dropdown, workspace
                        roots are grouped under{" "}
                        <span className="font-medium text-foreground">
                          Expense categories
                        </span>{" "}
                        and{" "}
                        <span className="font-medium text-foreground">
                          Income categories
                        </span>
                        .
                      </p>
                      <div className="mt-3">
                        <Table maxHeight="min(36rem,70vh)" className="text-sm">
                          <TableHeader>
                            <TableRow>
                              <TableHead>#</TableHead>
                              <TableHead>Category</TableHead>
                              {parentCol ? (
                                <TableHead>Parent in CSV</TableHead>
                              ) : null}
                              <TableHead>
                                Parent
                                <span className="mt-0.5 block font-normal text-muted">
                                  (expense / income roots)
                                </span>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedRows.map((csvRow, rowIdx) => {
                              const pickKey = categoryImportParentPickKey(rowIdx);
                              const pick = valuePicksByField[f.key]?.[pickKey];
                              const catName = nameCol
                                ? String(csvRow[nameCol] ?? "").trim()
                                : "";
                              const parentHint = parentCol
                                ? String(csvRow[parentCol] ?? "").trim()
                                : "";
                              const { selectValue, isAutoFallback } = effectiveFkSelectForRow(
                                pickKey,
                                pick,
                                entitiesForSelect,
                                { categoriesImportParentField: true },
                              );
                              return (
                                <TableRow key={pickKey}>
                                  <TableCell className="align-top text-muted">
                                    {rowIdx + 1}
                                  </TableCell>
                                  <TableCell className="align-top font-medium text-foreground">
                                    {catName ? (
                                      <span className="font-mono">{catName}</span>
                                    ) : (
                                      <span className="text-muted">(empty name)</span>
                                    )}
                                  </TableCell>
                                  {parentCol ? (
                                    <TableCell className="align-top font-mono text-muted">
                                      {parentHint || "—"}
                                    </TableCell>
                                  ) : null}
                                  <TableCell className="align-top">
                                    <div className="flex flex-col gap-2">
                                      <CsvFkQuickPick
                                        selectedId={selectValue || ""}
                                        emptyLabel={
                                          isAutoFallback
                                            ? "(auto match)"
                                            : "— choose —"
                                        }
                                        entities={entitiesForSelect}
                                        categoryGroups={categoryGroupsForSelect}
                                        extraItems={[
                                          {
                                            id: VALUE_PICK_SELECT_CATEGORY_IMPORT_PARENT_TOP,
                                            label: "Top-level (root)",
                                          },
                                        ]}
                                        ariaLabel="Parent category"
                                        onSelect={(v) => {
                                          setValuePicksByField((prev) => {
                                            const cur = { ...(prev[f.key] ?? {}) };
                                            if (
                                              v ===
                                                VALUE_PICK_SELECT_CATEGORY_IMPORT_PARENT_TOP
                                            ) {
                                              cur[pickKey] = { kind: "ignore" };
                                            } else if (v) {
                                              cur[pickKey] = {
                                                kind: "entity",
                                                entityId: v,
                                              };
                                            } else {
                                              delete cur[pickKey];
                                            }
                                            return { ...prev, [f.key]: cur };
                                          });
                                        }}
                                      />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                }
                const distinct = listDistinctForMoneyImportField(
                  kind,
                  f,
                  parsedRows,
                  columnByField,
                  headers,
                  5000,
                );
                const keys = mergeMatchValueRowKeys(distinct, valuePicksByField[f.key]);
                return (
                  <div key={f.key} className="rounded-[var(--radius-md)] border border-border p-4">
                    <h4 className="text-sm font-semibold text-foreground">
                      {f.label}
                    </h4>
                    <div className="mt-3">
                      <Table maxHeight="18rem" className="text-sm">
                        <TableHeader>
                          <TableRow>
                            <TableHead>CSV value</TableHead>
                            <TableHead>Maps to</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {keys.map((csvKey) => {
                            const rowKey = csvKey === "" ? "__csv_empty__" : csvKey;
                            const pick = valuePicksByField[f.key]?.[csvKey];
                            if (f.valueKind === "enum" || f.valueKind === "bool") {
                              const { selectValue, isAutoFallback } = effectiveEnumBoolSelectForRow(
                                f,
                                csvKey,
                                pick,
                              );
                              const opts =
                                f.valueKind === "enum" && f.enumValues
                                  ? f.enumValues
                                  : (["true", "false"] as const);
                              return (
                                <TableRow key={rowKey}>
                                  <TableCell className="align-top font-mono">{csvKey}</TableCell>
                                  <TableCell className="align-top">
                                    <Select
                                      value={
                                        pick?.kind === "ignore"
                                          ? VALUE_PICK_SELECT_IGNORE
                                          : selectValue || ""
                                      }
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setValuePicksByField((prev) => {
                                          const cur = { ...(prev[f.key] ?? {}) };
                                          if (v === VALUE_PICK_SELECT_IGNORE) {
                                            cur[csvKey] = { kind: "ignore" };
                                          } else {
                                            cur[csvKey] = { kind: "enum", value: v };
                                          }
                                          return { ...prev, [f.key]: cur };
                                        });
                                      }}
                                    >
                                      <option value="">
                                        {isAutoFallback ? "(auto)" : "— choose —"}
                                      </option>
                                      {opts.map((ev) => (
                                        <option key={ev} value={ev}>
                                          {ev}
                                        </option>
                                      ))}
                                      <option value={VALUE_PICK_SELECT_IGNORE}>Ignore</option>
                                    </Select>
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            const { selectValue, isAutoFallback } = effectiveFkSelectForRow(
                              csvKey,
                              pick,
                              entitiesForSelect,
                              { categoriesImportParentField },
                            );
                            const showNewDetails = pick?.kind === "new";
                            const csvLabel =
                              categoriesImportParentField && csvKey === ""
                                ? columnByField.parentId
                                  ? "(empty)"
                                  : "(no parent column — all rows)"
                                : csvKey;
                            return (
                              <TableRow key={rowKey}>
                                <TableCell className="align-top font-mono">{csvLabel}</TableCell>
                                <TableCell className="align-top">
                                  <div className="flex flex-col gap-2">
                                    <CsvFkQuickPick
                                      selectedId={selectValue || ""}
                                      emptyLabel={
                                        isAutoFallback
                                          ? "(auto match)"
                                          : "— choose —"
                                      }
                                      entities={entitiesForSelect}
                                      categoryGroups={categoryGroupsForSelect}
                                      extraItems={
                                        categoriesImportParentField
                                          ? [
                                              {
                                                id: VALUE_PICK_SELECT_CATEGORY_IMPORT_PARENT_TOP,
                                                label: "Top-level (root)",
                                              },
                                            ]
                                          : [
                                              {
                                                id: VALUE_PICK_SELECT_ADD_NEW,
                                                label: "Add new…",
                                              },
                                              {
                                                id: VALUE_PICK_SELECT_IGNORE,
                                                label: "Ignore",
                                              },
                                            ]
                                      }
                                      ariaLabel={`Map ${f.label}`}
                                      onSelect={(v) => {
                                        setValuePicksByField((prev) => {
                                          const cur = { ...(prev[f.key] ?? {}) };
                                          if (
                                            v ===
                                            VALUE_PICK_SELECT_CATEGORY_IMPORT_PARENT_TOP
                                          ) {
                                            cur[csvKey] = { kind: "ignore" };
                                          } else if (v === VALUE_PICK_SELECT_IGNORE) {
                                            cur[csvKey] = { kind: "ignore" };
                                          } else if (
                                            !categoriesImportParentField &&
                                            v === VALUE_PICK_SELECT_ADD_NEW
                                          ) {
                                            cur[csvKey] = {
                                              kind: "new",
                                              name: csvKey,
                                              ...(f.fk === "category_leaf"
                                                ? { parentCategoryId: undefined }
                                                : {}),
                                            };
                                          } else if (v) {
                                            cur[csvKey] = {
                                              kind: "entity",
                                              entityId: v,
                                            };
                                          } else {
                                            delete cur[csvKey];
                                          }
                                          return { ...prev, [f.key]: cur };
                                        });
                                      }}
                                    />
                                    {showNewDetails && f.fk === "account" ? (
                                      <div className="flex flex-wrap gap-2">
                                        <Field label="Name" className="min-w-[12rem] flex-1">
                                          <Input
                                            value={pick.name}
                                            onChange={(e) =>
                                              setValuePicksByField((prev) => {
                                                const cur = { ...(prev[f.key] ?? {}) };
                                                const p = cur[csvKey];
                                                if (p?.kind === "new") {
                                                  cur[csvKey] = { ...p, name: e.target.value };
                                                }
                                                return { ...prev, [f.key]: cur };
                                              })
                                            }
                                          />
                                        </Field>
                                        <Field label="Account type" className="min-w-[10rem]">
                                          <Select
                                            value={pick.accountType ?? ""}
                                            onChange={(e) => {
                                              const v = e.target.value;
                                              setValuePicksByField((prev) => {
                                                const cur = { ...(prev[f.key] ?? {}) };
                                                const p = cur[csvKey];
                                                if (p?.kind === "new") {
                                                  cur[csvKey] = {
                                                    ...p,
                                                    accountType:
                                                      v === ""
                                                        ? undefined
                                                        : (v as MoneyImportAccountType),
                                                  };
                                                }
                                                return { ...prev, [f.key]: cur };
                                              });
                                            }}
                                          >
                                            <option value="">Default (other)</option>
                                            {MONEY_IMPORT_ACCOUNT_TYPES.map((t) => (
                                              <option key={t} value={t}>
                                                {t}
                                              </option>
                                            ))}
                                          </Select>
                                        </Field>
                                      </div>
                                    ) : null}
                                    {showNewDetails && f.fk === "merchant" ? (
                                      <Field label="Name">
                                        <Input
                                          value={pick.name}
                                          onChange={(e) =>
                                            setValuePicksByField((prev) => {
                                              const cur = { ...(prev[f.key] ?? {}) };
                                              const p = cur[csvKey];
                                              if (p?.kind === "new") {
                                                cur[csvKey] = { ...p, name: e.target.value };
                                              }
                                              return { ...prev, [f.key]: cur };
                                            })
                                          }
                                        />
                                      </Field>
                                    ) : null}
                                    {showNewDetails && f.fk === "category_root" ? (
                                      <Field label="Category name">
                                        <Input
                                          value={pick.name}
                                          onChange={(e) =>
                                            setValuePicksByField((prev) => {
                                              const cur = { ...(prev[f.key] ?? {}) };
                                              const p = cur[csvKey];
                                              if (p?.kind === "new") {
                                                cur[csvKey] = { ...p, name: e.target.value };
                                              }
                                              return { ...prev, [f.key]: cur };
                                            })
                                          }
                                        />
                                      </Field>
                                    ) : null}
                                    {showNewDetails && f.fk === "category_leaf" ? (
                                      <div className="flex flex-col gap-2">
                                        <Field label="Name">
                                          <Input
                                            value={pick.name}
                                            onChange={(e) =>
                                              setValuePicksByField((prev) => {
                                                const cur = { ...(prev[f.key] ?? {}) };
                                                const p = cur[csvKey];
                                                if (p?.kind === "new") {
                                                  cur[csvKey] = { ...p, name: e.target.value };
                                                }
                                                return { ...prev, [f.key]: cur };
                                              })
                                            }
                                          />
                                        </Field>
                                        <Field label="Under parent">
                                          <CsvFkQuickPick
                                            selectedId={
                                              pick.parentCategoryId === undefined
                                                ? ""
                                                : pick.parentCategoryId === null
                                                  ? VALUE_PICK_CATEGORY_PARENT_TOP
                                                  : pick.parentCategoryId
                                            }
                                            emptyLabel="— choose parent —"
                                            entities={rootCategories.map((c) => ({
                                              id: c.id,
                                              name: c.name,
                                            }))}
                                            categoryGroups={fkCategoryGroupsForField(
                                              rootCategories,
                                              "category_root",
                                            )}
                                            extraItems={[
                                              {
                                                id: VALUE_PICK_CATEGORY_PARENT_TOP,
                                                label: "Top category (root)",
                                              },
                                            ]}
                                            ariaLabel="Under parent category"
                                            onSelect={(v) => {
                                              setValuePicksByField((prev) => {
                                                const cur = { ...(prev[f.key] ?? {}) };
                                                const p = cur[csvKey];
                                                if (p?.kind !== "new") return { ...prev };
                                                let parentCategoryId:
                                                  | string
                                                  | null
                                                  | undefined;
                                                if (v === "") parentCategoryId = undefined;
                                                else if (v === VALUE_PICK_CATEGORY_PARENT_TOP)
                                                  parentCategoryId = null;
                                                else parentCategoryId = v;
                                                cur[csvKey] = { ...p, parentCategoryId };
                                                return { ...prev, [f.key]: cur };
                                              });
                                            }}
                                          />
                                        </Field>
                                      </div>
                                    ) : null}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep("upload")}>
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!allRequiredColumnsMapped(kind, columnByField) || !valuesSatisfied}
              onClick={() => {
                syncValuePicks();
                runPreview();
              }}
            >
              Continue to review
            </Button>
          </div>
        </div>
      ) : null}

      {step === "review" && preview && kind ? (
        <div className="mt-8 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-foreground">Review import</h3>
            <p className="mt-1 text-sm text-muted">
              Importing{" "}
              <span className="font-medium text-foreground">
                {moneyImportSectionTitle[kind]}
              </span>
              {" · "}
              <span className="font-medium text-foreground tabular-nums">
                {preview.rows.length}
              </span>{" "}
              {preview.rows.length === 1 ? "row ready" : "rows ready"}
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3">
            <Card className="px-4 py-4">
              <p className="text-sm font-medium text-muted">Ready to import</p>
              <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                {preview.rows.length}
              </p>
            </Card>
            <Card className="px-4 py-4">
              <p className="text-sm font-medium text-muted">Rows with issues</p>
              <p
                className={cn(
                  "mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums",
                  preview.errors.length > 0 ? "text-destructive" : "text-foreground",
                )}
              >
                {preview.errors.length}
              </p>
            </Card>
          </div>

          {reviewPreviewColumns.length > 0 && reviewSampleRows.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium text-foreground">Preview</h4>
              <div className="mt-3">
                <Table className="min-w-[28rem] text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      {reviewPreviewColumns.map((col) => (
                        <TableHead key={col.key}>{col.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewSampleRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="align-top text-muted">{i + 1}</TableCell>
                        {reviewPreviewColumns.map((col) => (
                          <TableCell
                            key={col.key}
                            className="max-w-[14rem] truncate align-top text-foreground"
                          >
                            {formatImportPreviewCell(
                              (row as Record<string, unknown>)[col.key],
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          {preview.errors.length > 0 ? (
            <Alert
              variant="error"
              title={`${preview.errors.length} ${preview.errors.length === 1 ? "row needs" : "rows need"} attention`}
              list={preview.errors.flatMap((err) =>
                parseImportErrorMessages(err.message).map(
                  (msg) => `Row ${err.rowNumber}: ${msg}`,
                ),
              )}
            />
          ) : null}

          {reviewErrorCsv ? (
            <p className="text-sm text-muted">
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(reviewErrorCsv)}`}
                download="import-errors.csv"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Download error report
              </a>
            </p>
          ) : null}

          {preview.rows.length > 0 ? (
            <p className="text-sm text-foreground">
              Ready to import{" "}
              <span className="font-semibold tabular-nums">{preview.rows.length}</span>{" "}
              {moneyImportSectionTitle[kind].toLowerCase()}.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep("map")}>
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={busy !== null || preview.rows.length === 0}
              onClick={() => void runImport()}
            >
              {busy === "import"
                ? "Importing…"
                : `Import ${preview.rows.length} ${moneyImportSectionTitle[kind].toLowerCase()}`}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
