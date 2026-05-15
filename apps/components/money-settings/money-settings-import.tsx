"use client";

import { useCallback, useRef, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import {
  inputCls,
  secondaryBtnCls,
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";
import { Alert } from "@/components/ui/alert";
import {
  guessImportColumnTarget,
  importColumnSelectOptions,
} from "@/lib/money-import-column-map";
import type { ImportPreviewResponse } from "@/lib/money-import-types";
import {
  moneyImportTypes,
  type MoneyImportType,
} from "@/lib/money-import-types";

const TYPE_LABELS: Record<MoneyImportType, string> = {
  accounts: "Accounts",
  categories: "Categories",
  budgets: "Budgets",
  transactions: "Transactions",
  rules: "Rules",
  recurrence: "Recurrence",
};

const COLUMN_HELP: Record<MoneyImportType, string> = {
  accounts:
    "name (required), type (checking|savings|cash|credit|loan|investment|other), currency, institution, balanceMinor (integer cents), sortOrder, archived (true/false)",
  categories:
    "name (required), parentId (existing workspace root category UUID), parentSourceId (matches another row’s sourceId), sourceId (optional stable id for parentSourceId refs), archived",
  budgets:
    "scopeType (workspace|category|account|tag), scopeId (UUID or entity name; omit for workspace), limitAmountMinor (integer cents per month), currency",
  transactions:
    "accountId, amountMinor, kind (expense|income|transfer), occurredAt (ISO), categoryId, merchantId, notes, tagIds (comma UUIDs), tagNames (comma-separated), transferGroupId (same value pairs transfer rows)",
  rules:
    "name, priority, active, matchAccountId, matchMerchantId, actionSetCategoryId, actionTagIds (comma UUIDs) — or matchJson + actionJson (JSON objects)",
  recurrence:
    "name, cadence (weekly|biweekly|monthly|quarterly|yearly), nextRunAt, active, templateAccountId, templateKind, templateAmountMinor, templateCategoryId, templateMerchantId, templateNotes, templateTagIds — or templateJson (full template object)",
};

async function postPreview(form: FormData): Promise<ImportPreviewResponse> {
  const res = await fetch("/api/money/import/preview", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: ImportPreviewResponse;
    error?: string;
  };
  if (!res.ok) throw new Error(body.error ?? res.statusText);
  if (!body.data) throw new Error("Invalid preview response");
  return body.data;
}

async function abandonImportPreviewOnServer(previewId: string) {
  await fetch("/api/money/import/abandon", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ previewId }),
  });
}

async function postCommit(type: MoneyImportType, previewId: string) {
  const res = await fetch("/api/money/import/commit", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, previewId }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: { imported: number };
    error?: string;
  };
  if (!res.ok) throw new Error(body.error ?? res.statusText);
  return body.data?.imported ?? 0;
}

export function MoneySettingsImportSection() {
  const notify = useNotify();
  const serverPreviewIdRef = useRef<string | null>(null);
  const [importType, setImportType] = useState<MoneyImportType>("accounts");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [columnMapDraft, setColumnMapDraft] = useState<Record<string, string>>(
    {},
  );
  const [useManualMapping, setUseManualMapping] = useState(false);
  /** When set, allow commit while some rows still have errors (only `preview.rows` are sent). */
  const [importValidRowsOnly, setImportValidRowsOnly] = useState(false);

  const canCommit =
    preview &&
    preview.rows.length > 0 &&
    !busy &&
    (preview.errors.length === 0 || importValidRowsOnly);

  /** Shown when Confirm import is disabled (see `canCommit`). */
  const commitDisabledHint =
    preview && !busy
      ? preview.rows.length === 0
        ? preview.summary.total > 0
          ? "Confirm import is off because no rows passed validation (all rows have errors)."
          : "Confirm import is off because the file has no data rows."
        : preview.errors.length > 0 && !importValidRowsOnly
          ? `Confirm import is off while ${preview.errors.length} row(s) have errors. Fix them and preview again, or enable “Import only valid rows” below.`
          : null
      : busy
        ? "Wait until Preview or import finishes."
        : null;

  const resetPreview = useCallback(() => {
    const id = serverPreviewIdRef.current;
    serverPreviewIdRef.current = null;
    if (id) void abandonImportPreviewOnServer(id);
    setPreview(null);
    setFile(null);
    setColumnMapDraft({});
    setUseManualMapping(false);
    setImportValidRowsOnly(false);
  }, []);

  const mergeDraftFromHeaders = useCallback(
    (headers: string[], type: MoneyImportType) => {
      setColumnMapDraft((prev) => {
        const next: Record<string, string> = {};
        for (const h of headers) {
          next[h] = prev[h] ?? guessImportColumnTarget(h, type);
        }
        return next;
      });
    },
    [],
  );

  return (
    <SettingsSection
      id="money-settings-import"
      title="Import from CSV"
      description="Upload a UTF-8 CSV with a header row. Preview validates rows; confirm to write into your current Money workspace. Import reference data (accounts, categories, …) before transactions."
    >
      <div className="space-y-6">
        <p className="text-sm text-muted">
          <strong className="font-medium text-foreground">
            Columns for {TYPE_LABELS[importType]}:
          </strong>{" "}
          {COLUMN_HELP[importType]}
        </p>

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!file) {
              notify.error("Import", "Choose a CSV file.");
              return;
            }
            setBusy("preview");
            try {
              if (serverPreviewIdRef.current) {
                const prev = serverPreviewIdRef.current;
                serverPreviewIdRef.current = null;
                void abandonImportPreviewOnServer(prev);
              }
              const fd = new FormData();
              fd.set("type", importType);
              fd.set("file", file);
              if (useManualMapping) {
                if (!preview?.csvHeaders?.length) {
                  notify.error(
                    "Column mapping",
                    "Run Preview once without manual mapping so columns are detected.",
                  );
                  setBusy(null);
                  return;
                }
                const map: Record<string, string> = {};
                for (const h of preview.csvHeaders) {
                  map[h] = columnMapDraft[h] ?? "";
                }
                fd.set("columnMap", JSON.stringify(map));
              }
              const data = await postPreview(fd);
              serverPreviewIdRef.current = data.previewId;
              setPreview(data);
              mergeDraftFromHeaders(data.csvHeaders ?? [], importType);
              if (data.errors.length) {
                if (data.rows.length > 0) {
                  notify.success(
                    "Preview ready (partial)",
                    `${data.rows.length} valid row(s), ${data.errors.length} row(s) with errors — fix the file, or use “Import only valid rows”.`,
                  );
                } else {
                  notify.error(
                    "Preview has errors",
                    `${data.errors.length} row(s) need fixes before import.`,
                  );
                }
              } else if (data.rows.length === 0) {
                notify.error("Preview", "No data rows found in CSV.");
              } else {
                notify.success(
                  "Preview ready",
                  `${data.rows.length} row(s) validated. Review and confirm below.`,
                );
              }
            } catch (err: unknown) {
              notify.error(
                "Preview failed",
                err instanceof Error ? err.message : "Something went wrong",
              );
              serverPreviewIdRef.current = null;
              setPreview(null);
              setColumnMapDraft({});
              setUseManualMapping(false);
              setImportValidRowsOnly(false);
            } finally {
              setBusy(null);
            }
          }}
        >
          <label className="grid min-w-[min(100%,12rem)] flex-1 gap-1.5 text-sm">
            <span className="font-medium text-foreground">Data type</span>
            <select
              className={inputCls}
              value={importType}
              onChange={(e) => {
                setImportType(e.target.value as MoneyImportType);
                resetPreview();
              }}
            >
              {moneyImportTypes.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-[min(100%,14rem)] flex-1 gap-1.5 text-sm">
            <span className="font-medium text-foreground">CSV file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className={inputCls}
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null;
                resetPreview();
                setFile(next);
              }}
            />
          </label>
          <button
            type="submit"
            className={secondaryBtnCls}
            disabled={!file || busy !== null}
          >
            {busy === "preview" ? "Previewing…" : "Preview"}
          </button>
        </form>

        {preview && preview.csvHeaders.length > 0 ? (
          <div className="space-y-3 rounded-[var(--radius-md)] border border-border bg-surface/30 p-4 fx-fade-in">
            <div>
              <p className="text-sm font-medium text-foreground">
                Column mapping
              </p>
              <p className="mt-1 text-sm text-muted">
                If your CSV headers don’t match the expected names, map each
                column to a field (or Ignore). Turn on manual mapping and
                preview again to apply.
              </p>
            </div>
            <label className="flex max-w-xl cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-1"
                checked={useManualMapping}
                onChange={(e) => setUseManualMapping(e.target.checked)}
              />
              <span>
                <span className="font-medium">Use manual column mapping</span>{" "}
                for the next preview (sends the table below to the server).
              </span>
            </label>
            <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
              <table className="w-full min-w-[28rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/80 text-left">
                    <th className="p-2 font-medium text-foreground">
                      CSV column
                    </th>
                    <th className="p-2 font-medium text-foreground">
                      Maps to
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.csvHeaders.map((h) => (
                    <tr key={h} className="border-b border-border/80">
                      <td className="p-2 font-mono text-xs text-foreground">
                        {h || "(empty)"}
                      </td>
                      <td className="p-2">
                        <select
                          className={`${inputCls} w-full min-w-[12rem]`}
                          value={columnMapDraft[h] ?? ""}
                          onChange={(e) =>
                            setColumnMapDraft((d) => ({
                              ...d,
                              [h]: e.target.value,
                            }))
                          }
                        >
                          <option value="">— Ignore —</option>
                          {importColumnSelectOptions(importType).map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label} ({o.value})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className={secondaryBtnCls}
              disabled={busy !== null}
              onClick={() => {
                setColumnMapDraft(
                  Object.fromEntries(
                    preview.csvHeaders.map((header) => [
                      header,
                      guessImportColumnTarget(header, importType),
                    ]),
                  ),
                );
              }}
            >
              Reset mapping to best guess
            </button>
          </div>
        ) : null}

        {preview ? (
          <div className="space-y-4 rounded-[var(--radius-md)] border border-border bg-surface/50 p-4 fx-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Summary:</span>{" "}
                {preview.summary.total} row(s) in file,{" "}
                <span className="text-foreground">{preview.summary.valid}</span>{" "}
                valid
                {preview.summary.invalid > 0 ? (
                  <>
                    , {preview.summary.invalid} not imported (see errors)
                  </>
                ) : null}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={secondaryBtnCls}
                  onClick={resetPreview}
                  disabled={busy !== null}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={secondaryBtnCls}
                  disabled={!canCommit}
                  title={commitDisabledHint ?? undefined}
                  onClick={async () => {
                    if (!preview || !canCommit) return;
                    setBusy("commit");
                    try {
                      const n = await postCommit(
                        importType,
                        preview.previewId,
                      );
                      const partial =
                        importValidRowsOnly && preview.errors.length > 0;
                      notify.success(
                        "Import complete",
                        partial
                          ? `${n} record(s) imported. ${preview.summary.invalid} row(s) skipped (validation errors).`
                          : `${n} record(s) imported.`,
                      );
                      resetPreview();
                    } catch (err: unknown) {
                      notify.error(
                        "Import failed",
                        err instanceof Error
                          ? err.message
                          : "Something went wrong",
                      );
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  {busy === "commit" ? "Importing…" : "Confirm import"}
                </button>
              </div>
            </div>
            {preview.errors.length > 0 && preview.rows.length > 0 ? (
              <label className="flex max-w-2xl cursor-pointer items-start gap-2 rounded-[var(--radius-md)] border border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] p-3 text-sm text-foreground transition-colors duration-200 fx-press">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={importValidRowsOnly}
                  onChange={(e) => setImportValidRowsOnly(e.target.checked)}
                />
                <span>
                  <span className="font-medium">Import only valid rows</span>{" "}
                  — commit the {preview.rows.length} validated row(s) and skip{" "}
                  {preview.summary.invalid} row(s) that failed validation.
                </span>
              </label>
            ) : null}
            {commitDisabledHint ? (
              <p className="text-sm text-muted">{commitDisabledHint}</p>
            ) : null}

            {preview.warnings.length ? (
              <Alert
                variant="warning"
                title="Warnings"
                list={preview.warnings.map((w) =>
                  `${w.rowNumber != null ? `Row ${w.rowNumber}: ` : ""}${w.message}`,
                )}
              />
            ) : null}

            {preview.errors.length ? (
              <Alert
                variant="error"
                title="Errors (fix CSV or column mapping, then preview again)"
                list={preview.errors.map(
                  (er) => `Row ${er.rowNumber}: ${er.message}`,
                )}
              />
            ) : null}

            {preview.rows.length ? (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Preview (first rows)
                </p>
                <pre className="max-h-64 overflow-auto rounded-[var(--radius-md)] border border-border bg-background p-3 text-xs text-foreground">
                  {JSON.stringify(preview.rows.slice(0, 30), null, 2)}
                  {preview.rows.length > 30
                    ? `\n… ${preview.rows.length - 30} more`
                    : ""}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </SettingsSection>
  );
}
