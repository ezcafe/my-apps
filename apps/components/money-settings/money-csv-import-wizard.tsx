"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import {
  inputCls,
  MoneySettingsBackLink,
  primaryBtnCls,
  secondaryBtnCls,
} from "@/components/money-settings/money-settings-shared";
import { Alert } from "@/components/ui/alert";
import { moneyApiJson } from "@/lib/money-fetch";
import { fkEntityRowsForField } from "@/lib/money-import-fk-synonym";
import {
  MONEY_IMPORT_ACCOUNT_TYPES,
  moneyImportApiPath,
  moneyImportFieldDefs,
  moneyImportSectionTitle,
  type MoneyImportKind,
} from "@/lib/money-import-kinds";
import {
  buildInitialValuePickByField,
  effectiveEnumBoolSelectForRow,
  effectiveFkSelectForRow,
  enumBoolPickSatisfiesImport,
  fkPickSatisfiesImport,
  mergeMatchValueRowKeys,
  pruneAndAutoFillEnumBoolPicks,
  pruneAndAutoFillFkPicks,
  VALUE_PICK_CATEGORY_PARENT_TOP,
  VALUE_PICK_SELECT_ADD_NEW,
  VALUE_PICK_SELECT_IGNORE,
  type MoneyImportAccountType,
  type MoneyImportValuePick,
} from "@/lib/money-import-value-picks";
import { listDistinctForMoneyImportField } from "@/lib/money-import-value-map";
import { buildMoneyCsvImportRows } from "@/lib/money-csv-import-rows";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";

type WizardStep = "type" | "upload" | "map" | "review";

type AccountRow = { id: string; name: string };
type MerchantRow = { id: string; name: string };

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
  type: { title: "Import type", hint: "Choose what you are importing" },
  upload: { title: "Upload", hint: "CSV file with a header row" },
  map: { title: "Map", hint: "Match columns and resolve values" },
  review: { title: "Review", hint: "Confirm before importing" },
};

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
    <nav aria-label="Import steps" className="mt-6 space-y-3">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Step {currentIdx + 1} of {STEP_ORDER.length}
        </span>
        <span className="font-medium text-foreground">
          {STEP_META[current].title}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-foreground transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <ol role="list" className="flex flex-wrap gap-2 text-xs">
        {STEP_ORDER.map((id, i) => {
          const done = i < currentIdx;
          const active = id === current;
          const future = i > currentIdx;
          return (
            <li key={id}>
              <button
                type="button"
                disabled={future}
                onClick={() => {
                  if (!future && i !== currentIdx) onStepClick(id);
                }}
                aria-current={active ? "step" : undefined}
                className={`rounded-full border px-2.5 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : done
                      ? "border-border bg-surface text-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_5%,transparent)]"
                      : "border-border bg-surface text-muted"
                }`}
              >
                {i + 1}. {STEP_META[id].title}
              </button>
            </li>
          );
        })}
      </ol>
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

async function createPendingNewEntities(
  defs: ReturnType<typeof moneyImportFieldDefs>,
  valuePicksByField: Record<string, Record<string, MoneyImportValuePick>>,
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
        const { data } = await moneyApiJson<{ id: string }>("/api/money/accounts", {
          method: "POST",
          body: JSON.stringify({
            name,
            type: p.accountType ?? "other",
          }),
        });
        map.set(csvKey, data.id);
      } else if (f.fk === "merchant") {
        const { data } = await moneyApiJson<{ id: string }>("/api/money/merchants", {
          method: "POST",
          body: JSON.stringify({ name }),
        });
        map.set(csvKey, data.id);
      } else if (f.fk === "category_root") {
        const { data } = await moneyApiJson<{ id: string }>("/api/money/categories", {
          method: "POST",
          body: JSON.stringify({ name, parentId: null }),
        });
        map.set(csvKey, data.id);
      } else if (f.fk === "category_leaf") {
        if (p.parentCategoryId === undefined) {
          throw new Error(`${f.label}: choose parent or top category for "${csvKey}"`);
        }
        const { data } = await moneyApiJson<{ id: string }>("/api/money/categories", {
          method: "POST",
          body: JSON.stringify({
            name,
            parentId: p.parentCategoryId,
          }),
        });
        map.set(csvKey, data.id);
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
  const [preview, setPreview] = useState<{
    rows: unknown[];
    errors: { rowNumber: number; message: string }[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, m, c] = await Promise.all([
          moneyApiJson<AccountRow[]>("/api/money/accounts"),
          moneyApiJson<MerchantRow[]>("/api/money/merchants"),
          moneyApiJson<MoneyCategoryRow[]>("/api/money/categories"),
        ]);
        if (cancelled) return;
        setAccounts(a.data);
        setMerchants(m.data);
        setCategories(c.data);
      } catch {
        if (!cancelled) notify.error("Could not load accounts, merchants, or categories.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notify]);

  useEffect(() => {
    setKind(initialKind ?? null);
    setStep(initialKind ? "upload" : "type");
  }, [initialKind]);

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
      if (!col) return false;
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
        if (!col) continue;
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
              : fkEntityRowsForField(f.fk, accounts, merchants, categories);
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
    syncValuePicks();
  }, [syncValuePicks]);

  const rootCategories = useMemo(
    () => categories.filter((c) => c.parentId == null),
    [categories],
  );

  const valuesSatisfied = useMemo(() => {
    if (!kind) return false;
    for (const f of valueFields) {
      const col = columnByField[f.key] ?? "";
      if (!col) continue;
      const distinct = listDistinctForMoneyImportField(
        kind,
        f,
        parsedRows,
        columnByField,
        headers,
        5000,
      );
      const keys = mergeMatchValueRowKeys(distinct, valuePicksByField[f.key]);
      const entities = f.fk
        ? kind === "transactions" && f.key === "categoryId" && f.fk === "category_leaf"
          ? txAllCategoryEntities
          : fkEntityRowsForField(f.fk, accounts, merchants, categories)
        : [];
      for (const k of keys) {
        const pick = valuePicksByField[f.key]?.[k];
        if (f.valueKind === "enum" || f.valueKind === "bool") {
          if (!enumBoolPickSatisfiesImport(f, k, pick)) return false;
        } else if (f.fk) {
          if (!fkPickSatisfiesImport(f, k, pick, entities)) return false;
        }
      }
    }
    return true;
  }, [
    valueFields,
    columnByField,
    parsedRows,
    headers,
    kind,
    valuePicksByField,
    accounts,
    merchants,
    categories,
    txAllCategoryEntities,
  ]);

  const refreshEntityLists = useCallback(async () => {
    const [a, m, c] = await Promise.all([
      moneyApiJson<AccountRow[]>("/api/money/accounts"),
      moneyApiJson<MerchantRow[]>("/api/money/merchants"),
      moneyApiJson<MoneyCategoryRow[]>("/api/money/categories"),
    ]);
    setAccounts(a.data);
    setMerchants(m.data);
    setCategories(c.data);
    return {
      accounts: a.data,
      merchants: m.data,
      categories: c.data,
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
      { accounts, merchants, categories },
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
      const createdMaps = await createPendingNewEntities(defs, valuePicksByField);
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
      const { data } = await moneyApiJson<{ created: number }>(moneyImportApiPath(kind), {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
      notify.success(`Imported ${data.created} row(s).`);
      resetWizard();
    } catch (e: unknown) {
      notify.error(e instanceof Error ? e.message : "Import failed");
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
      const { data } = await moneyApiJson<{ headers: string[]; rows: Record<string, string>[] }>(
        "/api/money/csv/parse",
        { method: "POST", body: JSON.stringify({ csv: csvText }) },
      );
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
      notify.error(e instanceof Error ? e.message : "Parse failed");
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

  return (
    <div className="min-w-0 max-w-4xl">
      <MoneySettingsBackLink />
      <h2 className="text-xl font-semibold text-foreground">Import</h2>
      <p className="mt-1 text-sm text-muted">
        CSV import for your workspace. More sources (e.g. PDF) may be added later.
      </p>

      <ImportProgress current={step} onStepClick={goToStep} />

      {step === "type" ? (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-foreground">Choose import type</h3>
          <p className="mt-1 text-sm text-muted">
            Pick what you want to import. You can change this later from the progress steps.
          </p>
          <ul
            role="list"
            className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-md bg-border shadow-sm ring-1 ring-[color-mix(in_oklab,var(--foreground)_8%,transparent)] sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Import types"
          >
            {KINDS_ORDER.map((k) => (
              <li key={k} className="min-w-0">
                <button
                  type="button"
                  onClick={() => handlePickKind(k)}
                  className="relative flex w-full items-center gap-x-3 bg-surface px-4 py-5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_5%,transparent)] focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground"
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
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">CSV file</span>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className={`${inputCls} cursor-pointer file:mr-3 file:cursor-pointer`}
              disabled={busy !== null}
              onChange={(e) => void handleCsvFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {csvFileName ? (
            <p className="text-xs text-muted">
              Selected: <span className="font-mono text-foreground">{csvFileName}</span>
            </p>
          ) : null}
          <button type="button" className={secondaryBtnCls} onClick={() => setStep("type")}>
            Back
          </button>
        </div>
      ) : null}

      {step === "map" && kind ? (
        <div className="mt-8 space-y-10">
          <div>
            <Alert
              variant="warning"
              className="mb-4"
              title="Column mapping"
              description={`${parsedRows.length} data row(s). Map each CSV column to a field (optional columns can be skipped).`}
            />
            <h3 className="text-sm font-medium text-foreground">Column mapping</h3>
            <p className="mt-1 text-sm text-muted">
              First row shows a sample value from your file for each column.
            </p>
            <div className="mt-3 overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-border bg-background text-left">
                    <th className="px-3 py-2 font-medium text-foreground">CSV column</th>
                    <th className="w-10 px-1 py-2" aria-hidden />
                    <th className="px-3 py-2 font-medium text-foreground">Maps to</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((h) => {
                    const sample = firstRowSample(h);
                    const unmappedRequired = moneyImportFieldDefs(kind).filter(
                      (f) =>
                        f.required &&
                        !Object.entries(dbFieldByCsvCol).some(
                          ([col, fk]) => col !== h && fk === f.key,
                        ) &&
                        dbFieldByCsvCol[h] !== f.key &&
                        !headers.some(
                          (col) => col !== h && dbFieldByCsvCol[col] === f.key,
                        ),
                    );
                    return (
                      <tr key={h} className="border-b border-border/60">
                        <td className="align-top px-3 py-3">
                          <div className="font-medium text-foreground">{h}</div>
                          <div className="mt-1 max-w-xs truncate font-mono text-xs text-muted">
                            {sample || "—"}
                          </div>
                        </td>
                        <td className="align-middle px-1 py-3">
                          <MapArrowIcon />
                        </td>
                        <td className="px-3 py-3">
                          <select
                            className={inputCls}
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
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!allRequiredColumnsMapped(kind, columnByField) ? (
              <p className="mt-2 text-sm text-destructive">
                Map all required fields (marked with *).
              </p>
            ) : null}
          </div>

          {valueFields.length > 0 ? (
            <div className="space-y-6">
              <h3 className="text-sm font-medium text-foreground">Value mapping</h3>
              {valueFields.map((f) => {
                const distinct = listDistinctForMoneyImportField(
                  kind,
                  f,
                  parsedRows,
                  columnByField,
                  headers,
                  5000,
                );
                const keys = mergeMatchValueRowKeys(distinct, valuePicksByField[f.key]);
                const entities =
                  f.fk != null
                    ? fkEntityRowsForField(f.fk, accounts, merchants, categories)
                    : [];
                const txCategoryEntities =
                  kind === "transactions" && f.key === "categoryId" && f.fk === "category_leaf"
                    ? txAllCategoryEntities
                    : null;
                const entitiesForSelect = txCategoryEntities ?? entities;
                return (
                  <div key={f.key} className="rounded-md border border-border p-4">
                    <h4 className="text-sm font-semibold text-foreground">
                      {f.label}
                      <span className="ml-2 font-normal text-muted">({f.key})</span>
                    </h4>
                    <div className="mt-3 max-h-72 overflow-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-muted">
                            <th className="py-1 pr-2">CSV value</th>
                            <th className="py-1">Maps to</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keys.map((csvKey) => {
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
                                <tr key={csvKey} className="border-t border-border/40">
                                  <td className="py-2 pr-2 align-top font-mono">{csvKey}</td>
                                  <td className="py-2 align-top">
                                    <select
                                      className={inputCls}
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
                                    </select>
                                  </td>
                                </tr>
                              );
                            }
                            const { selectValue, isAutoFallback } = effectiveFkSelectForRow(
                              csvKey,
                              pick,
                              entitiesForSelect,
                            );
                            const showNewDetails = pick?.kind === "new";
                            return (
                              <tr key={csvKey} className="border-t border-border/40">
                                <td className="py-2 pr-2 align-top font-mono">{csvKey}</td>
                                <td className="py-2 align-top">
                                  <div className="flex flex-col gap-2">
                                    <select
                                      className={inputCls}
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
                                          } else if (v === VALUE_PICK_SELECT_ADD_NEW) {
                                            cur[csvKey] = {
                                              kind: "new",
                                              name: csvKey,
                                              ...(f.fk === "category_leaf"
                                                ? { parentCategoryId: undefined }
                                                : {}),
                                            };
                                          } else if (v) {
                                            cur[csvKey] = { kind: "entity", entityId: v };
                                          }
                                          return { ...prev, [f.key]: cur };
                                        });
                                      }}
                                    >
                                      <option value="">
                                        {isAutoFallback ? "(auto match)" : "— choose —"}
                                      </option>
                                      {entitiesForSelect.map((e) => (
                                        <option key={e.id} value={e.id}>
                                          {e.name}
                                        </option>
                                      ))}
                                      <option value={VALUE_PICK_SELECT_ADD_NEW}>Add new…</option>
                                      <option value={VALUE_PICK_SELECT_IGNORE}>Ignore</option>
                                    </select>
                                    {showNewDetails && f.fk === "account" ? (
                                      <div className="flex flex-wrap gap-2">
                                        <label className="grid min-w-[12rem] flex-1 gap-1">
                                          <span className="text-muted">Name</span>
                                          <input
                                            className={inputCls}
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
                                        </label>
                                        <label className="grid min-w-[10rem] gap-1">
                                          <span className="text-muted">Account type</span>
                                          <select
                                            className={inputCls}
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
                                          </select>
                                        </label>
                                      </div>
                                    ) : null}
                                    {showNewDetails && f.fk === "merchant" ? (
                                      <label className="grid gap-1">
                                        <span className="text-muted">Name</span>
                                        <input
                                          className={inputCls}
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
                                      </label>
                                    ) : null}
                                    {showNewDetails && f.fk === "category_root" ? (
                                      <label className="grid gap-1">
                                        <span className="text-muted">Category name</span>
                                        <input
                                          className={inputCls}
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
                                      </label>
                                    ) : null}
                                    {showNewDetails && f.fk === "category_leaf" ? (
                                      <div className="flex flex-col gap-2">
                                        <label className="grid gap-1">
                                          <span className="text-muted">Name</span>
                                          <input
                                            className={inputCls}
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
                                        </label>
                                        <label className="grid gap-1">
                                          <span className="text-muted">Under parent</span>
                                          <select
                                            className={inputCls}
                                            value={
                                              pick.parentCategoryId === undefined
                                                ? ""
                                                : pick.parentCategoryId === null
                                                  ? VALUE_PICK_CATEGORY_PARENT_TOP
                                                  : pick.parentCategoryId
                                            }
                                            onChange={(e) => {
                                              const v = e.target.value;
                                              setValuePicksByField((prev) => {
                                                const cur = { ...(prev[f.key] ?? {}) };
                                                const p = cur[csvKey];
                                                if (p?.kind !== "new") return { ...prev };
                                                let parentCategoryId: string | null | undefined;
                                                if (v === "") parentCategoryId = undefined;
                                                else if (v === VALUE_PICK_CATEGORY_PARENT_TOP)
                                                  parentCategoryId = null;
                                                else parentCategoryId = v;
                                                cur[csvKey] = { ...p, parentCategoryId };
                                                return { ...prev, [f.key]: cur };
                                              });
                                            }}
                                          >
                                            <option value="">— choose parent —</option>
                                            <option value={VALUE_PICK_CATEGORY_PARENT_TOP}>
                                              Top category (root)
                                            </option>
                                            {rootCategories.map((c) => (
                                              <option key={c.id} value={c.id}>
                                                {c.name}
                                              </option>
                                            ))}
                                          </select>
                                        </label>
                                      </div>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryBtnCls} onClick={() => setStep("upload")}>
              Back
            </button>
            <button
              type="button"
              className={primaryBtnCls}
              disabled={!allRequiredColumnsMapped(kind, columnByField) || !valuesSatisfied}
              onClick={() => {
                syncValuePicks();
                runPreview();
              }}
            >
              Continue to review
            </button>
          </div>
        </div>
      ) : null}

      {step === "review" && preview && kind ? (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-muted">
            Valid rows: {preview.rows.length}. Row issues: {preview.errors.length}.
          </p>
          {preview.errors.length > 0 ? (
            <div className="max-h-40 overflow-auto rounded-md border border-border bg-background p-2 text-xs font-mono">
              {preview.errors.slice(0, 40).map((e, i) => (
                <div key={i}>
                  Row {e.rowNumber}: {e.message}
                </div>
              ))}
              {preview.errors.length > 40 ? <div>…</div> : null}
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[28rem] text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="px-2 py-2 font-medium text-foreground">#</th>
                  <th className="px-2 py-2 font-medium text-foreground">Row (JSON)</th>
                </tr>
              </thead>
              <tbody>
                {reviewSampleRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/60 font-mono">
                    <td className="align-top px-2 py-2 text-muted">{i + 1}</td>
                    <td className="max-w-0 break-all px-2 py-2 text-foreground">
                      {JSON.stringify(row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryBtnCls} onClick={() => setStep("map")}>
              Back
            </button>
            <button
              type="button"
              className={primaryBtnCls}
              disabled={busy !== null || preview.rows.length === 0}
              onClick={() => void runImport()}
            >
              {busy === "import" ? "Importing…" : `Import ${preview.rows.length} row(s)`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
