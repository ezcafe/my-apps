"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatMinor } from "@/lib/format-money";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";
import {
  moneyQuickPickChipCls,
  moneyQuickPickGroupCls,
} from "@/lib/money-quick-pick-chip-cls";
import { MoneyStatusEmphasis, MoneyStatusStrip } from "@/lib/money-status-strip";
import { ImportWizardStepProgress } from "@/components/import-wizard-step-progress";
import type { StatementPlatform } from "@/lib/investment-statement-parsers";
import type { StatementImportPreviewResponse } from "@/lib/investment-services/import-statement";
import { invalidateInvestmentWorkspaceQueries } from "@/lib/investment-query-options";
import { toUserFacingMessage } from "@/lib/user-facing-error";

type WizardStep = "platform" | "upload" | "preview" | "success";

const STEP_ORDER: WizardStep[] = ["platform", "upload", "preview", "success"];

const STEP_META: Record<WizardStep, { title: string; hint: string }> = {
  platform: {
    title: "Platform",
    hint: "Choose your trading platform or leave on Auto-detect.",
  },
  upload: {
    title: "Upload",
    hint: "Upload your statement file (.html, .htm, or .csv).",
  },
  preview: {
    title: "Preview & Map",
    hint: "Review detected trades, positions, cash moves, and target account.",
  },
  success: {
    title: "Done",
    hint: "Statement activities recorded to your investment journal.",
  },
};

const PLATFORMS: Array<{
  id: StatementPlatform | "auto";
  name: string;
  badge: string;
  description: string;
}> = [
  {
    id: "auto",
    name: "Auto-detect",
    badge: "Recommended",
    description: "Detects cTrader or Binance automatically from file structure.",
  },
  {
    id: "ctrader",
    name: "cTrader",
    badge: "HTML",
    description: "cTrader monthly, daily, or custom period HTML statements (IC Markets, Pepperstone, etc.).",
  },
  {
    id: "binance",
    name: "Binance",
    badge: "CSV",
    description: "Binance Spot trade history, Futures trades, and transaction records.",
  },
];

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

function ImportProgress({
  current,
  onStepClick,
}: {
  current: WizardStep;
  onStepClick: (s: WizardStep) => void;
}) {
  return (
    <ImportWizardStepProgress
      steps={STEP_ORDER}
      stepMeta={STEP_META}
      current={current}
      onStepClick={onStepClick}
    />
  );
}

export function InvestmentStatementImportWizard() {
  const notify = useNotify();
  const fileInputId = useId();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<WizardStep>("platform");
  const [selectedPlatform, setSelectedPlatform] = useState<StatementPlatform | "auto">("auto");
  const [fileContent, setFileContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  const [previewData, setPreviewData] = useState<StatementImportPreviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"trades" | "positions" | "cash" | "symbols">("trades");

  const [targetAccountId, setTargetAccountId] = useState<string>("");
  const [autoCreateInstruments, setAutoCreateInstruments] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [importResult, setImportResult] = useState<{
    importedTradesCount: number;
    importedPositionsCount: number;
    importedCashMovesCount: number;
    createdInstrumentsCount: number;
  } | null>(null);

  const handleFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    setFileName(file.name);
    setError(null);

    if (file.size > 15 * 1024 * 1024) {
      setError("File size exceeds 15MB limit.");
      return;
    }

    try {
      const text = await file.text();
      setFileContent(text);
    } catch {
      setError("Failed to read file.");
    }
  };

  const handlePreview = async () => {
    if (!fileContent.trim()) {
      setError("Please select or paste a statement file first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const platformParam = selectedPlatform === "auto" ? undefined : selectedPlatform;
      const res = await fetch("/api/investment/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: fileContent,
          platform: platformParam,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to parse statement");
      }

      const data = json.data as StatementImportPreviewResponse;
      setPreviewData(data);

      if (data.availableAccounts && data.availableAccounts.length > 0) {
        const inv = data.availableAccounts.find((a) => a.type === "investment");
        setTargetAccountId(inv ? inv.id : data.availableAccounts[0]!.id);
      }

      setStep("preview");
      notify.success("Statement parsed", `Detected ${data.parseResult.detectedFormatName}`);
    } catch (e: unknown) {
      setError(toUserFacingMessage(e, "Error parsing statement file"));
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/investment/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moneyAccountId: targetAccountId || undefined,
          autoCreateMissingInstruments: autoCreateInstruments,
          skipDuplicates,
          trades: previewData.parseResult.closedTrades,
          positions: previewData.parseResult.openPositions,
          cashMoves: previewData.parseResult.cashMoves,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to import statement");
      }

      setImportResult(json.data);
      setStep("success");
      await invalidateInvestmentWorkspaceQueries(queryClient);
      await queryClient.invalidateQueries({ queryKey: ["money"] });
      notify.success(
        "Import completed",
        `Imported ${json.data.importedTradesCount} trades and ${json.data.importedPositionsCount} open positions.`,
      );
    } catch (e: unknown) {
      setError(toUserFacingMessage(e, "Error importing statement"));
    } finally {
      setLoading(false);
    }
  };

  const resetImport = () => {
    setStep("platform");
    setSelectedPlatform("auto");
    setFileContent("");
    setFileName("");
    setPreviewData(null);
    setImportResult(null);
    setError(null);
  };

  const goToStep = (s: WizardStep) => {
    const cur = STEP_ORDER.indexOf(step);
    const tgt = STEP_ORDER.indexOf(s);
    if (tgt >= cur) return;
    setStep(s);
    if (s === "platform" || s === "upload") {
      setPreviewData(null);
    }
  };

  const selectedPlatformObj = PLATFORMS.find((p) => p.id === selectedPlatform);

  return (
    <div className={cn(SHELL_FULL_SPAN, "min-w-0")}>
      <ImportProgress current={step} onStepClick={goToStep} />

      {error ? (
        <Alert variant="error" title="Import notice" description={error} className="mt-6" />
      ) : null}

      {/* STEP 1: PLATFORM SELECTION */}
      {step === "platform" ? (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-foreground">Select statement platform</h3>
          <p className="mt-1 text-sm text-muted">
            Choose your trading platform or leave on Auto-detect to inspect the file headers.
          </p>
          <ul
            role="list"
            className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-px overflow-hidden rounded-[var(--radius-md)] bg-border shadow-[var(--shadow-sm)]"
            aria-label="Statement platforms"
          >
            {PLATFORMS.map((p) => {
              const isSelected = selectedPlatform === p.id;
              return (
                <li key={p.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlatform(p.id);
                      setStep("upload");
                    }}
                    className={cn(
                      "relative flex w-full flex-col items-start gap-1 bg-surface px-4 py-5 text-left transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--foreground)_5%,transparent)] focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground",
                      isSelected && "ring-1 ring-inset ring-accent",
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="min-w-0 text-sm font-semibold text-foreground">
                        {p.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-[var(--radius-sm)] bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {p.badge}
                        </span>
                        <ImportTypeChevron />
                      </div>
                    </div>
                    <p className="text-xs text-muted line-clamp-2">{p.description}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* STEP 2: UPLOAD FILE */}
      {step === "upload" ? (
        <div className="mt-8 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-foreground">Upload statement file</h3>
            <p className="mt-1 text-sm text-muted">
              Platform: <span className="font-medium text-foreground">{selectedPlatformObj?.name ?? "Auto-detect"}</span>. File must be .html, .htm, .csv, or text export.
            </p>
          </div>

          <Field label="Statement file">
            <Input
              id={fileInputId}
              type="file"
              accept=".html,.htm,.csv,.txt"
              className="cursor-pointer file:mr-3 file:cursor-pointer"
              disabled={loading}
              onChange={(e) => void handleFileChange(e.target.files)}
            />
          </Field>

          {fileName ? (
            <p className="text-sm text-muted">
              Selected: <span className="font-mono text-foreground">{fileName}</span>
            </p>
          ) : null}

          <Field label="Or paste statement contents (optional)">
            <textarea
              rows={4}
              value={fileContent}
              onChange={(e) => {
                setFileContent(e.target.value);
                setFileName("pasted-statement.txt");
              }}
              placeholder="Paste raw HTML or CSV contents here…"
              className="w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-hidden"
            />
          </Field>

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setStep("platform")}>
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!fileContent.trim() || loading}
              onClick={() => void handlePreview()}
            >
              {loading ? "Parsing statement…" : "Preview Statement"}
            </Button>
          </div>
        </div>
      ) : null}

      {/* STEP 3: PREVIEW & MAP */}
      {step === "preview" && previewData ? (
        <div className="mt-8 space-y-8">
          <MoneyStatusStrip>
            <MoneyStatusEmphasis>{previewData.parseResult.closedTrades.length}</MoneyStatusEmphasis> closed trades ·{" "}
            <MoneyStatusEmphasis>{previewData.parseResult.openPositions.length}</MoneyStatusEmphasis> open positions ·{" "}
            <MoneyStatusEmphasis>{previewData.parseResult.cashMoves.length}</MoneyStatusEmphasis> cash moves ·{" "}
            <MoneyStatusEmphasis>{previewData.symbolsSummary.length}</MoneyStatusEmphasis> instruments ·{" "}
            <span className="font-medium text-foreground">{previewData.parseResult.detectedFormatName}</span>
          </MoneyStatusStrip>

          {/* Account Target and Options Card */}
          <div className="rounded-[var(--radius-md)] border border-border bg-background p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="rounded-[var(--radius-sm)] bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {previewData.parseResult.detectedFormatName}
                </span>
                <h3 className="mt-2 text-base font-semibold text-foreground">
                  Statement: {previewData.parseResult.account.accountNumber ? `Account #${previewData.parseResult.account.accountNumber}` : "Portfolio Import"}
                </h3>
                <p className="text-xs text-muted">
                  {previewData.parseResult.account.brokerOrPlatform} · {previewData.parseResult.summary.currency}
                  {previewData.parseResult.account.periodStart ? ` · ${previewData.parseResult.account.periodStart} to ${previewData.parseResult.account.periodEnd ?? ""}` : ""}
                </p>
              </div>

              {/* KPI chips */}
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="rounded-[var(--radius-sm)] border border-border bg-muted/20 px-3 py-2">
                  <div className="text-muted">Closed Trades</div>
                  <div className="text-sm font-semibold tabular-nums text-foreground">
                    {previewData.parseResult.summary.totalTrades}
                  </div>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-border bg-muted/20 px-3 py-2">
                  <div className="text-muted">Open Positions</div>
                  <div className="text-sm font-semibold tabular-nums text-foreground">
                    {previewData.parseResult.summary.totalPositions}
                  </div>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-border bg-muted/20 px-3 py-2">
                  <div className="text-muted">Net P&L</div>
                  <div
                    className={`text-sm font-semibold tabular-nums ${
                      previewData.parseResult.summary.totalNetPnlMinor >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {formatMinor(
                      previewData.parseResult.summary.totalNetPnlMinor,
                      previewData.parseResult.summary.currency,
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Target Account and Duplicate Options */}
            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
              <Field label="Post activities to Money account">
                <Select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                >
                  {previewData.availableAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency} · {acc.type})
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="flex flex-col justify-end gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={autoCreateInstruments}
                    onChange={() => setAutoCreateInstruments(!autoCreateInstruments)}
                    ariaLabel="Auto-create missing instruments"
                  />
                  <span className="text-xs text-foreground">
                    Auto-create missing instruments & contract sizes
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={skipDuplicates}
                    onChange={() => setSkipDuplicates(!skipDuplicates)}
                    ariaLabel="Skip existing duplicates"
                  />
                  <span className="text-xs text-foreground">
                    Skip existing duplicates ({previewData.duplicateTradeIds.length + previewData.duplicatePositionIds.length} detected)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subtabs for preview details */}
          <div className="space-y-4">
            <div role="tablist" aria-label="Statement preview sections" className={moneyQuickPickGroupCls}>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "trades"}
                onClick={() => setActiveTab("trades")}
                className={moneyQuickPickChipCls(activeTab === "trades")}
              >
                Closed Trades ({previewData.parseResult.closedTrades.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "positions"}
                onClick={() => setActiveTab("positions")}
                className={moneyQuickPickChipCls(activeTab === "positions")}
              >
                Open Positions ({previewData.parseResult.openPositions.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "cash"}
                onClick={() => setActiveTab("cash")}
                className={moneyQuickPickChipCls(activeTab === "cash")}
              >
                Cash Moves ({previewData.parseResult.cashMoves.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "symbols"}
                onClick={() => setActiveTab("symbols")}
                className={moneyQuickPickChipCls(activeTab === "symbols")}
              >
                Instruments ({previewData.symbolsSummary.length})
              </button>
            </div>

            {/* Closed Trades Table */}
            {activeTab === "trades" && (
              <div className="max-h-96 overflow-auto rounded-[var(--radius-md)] border border-border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Lots / Size</TableHead>
                      <TableHead className="text-right">Open Price</TableHead>
                      <TableHead className="text-right">Close Price</TableHead>
                      <TableHead className="text-right">Fee / Swap</TableHead>
                      <TableHead className="text-right">Net P&L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.parseResult.closedTrades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-xs text-muted">
                          No closed trades found in statement.
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewData.parseResult.closedTrades.map((trade) => {
                        const isDup = previewData.duplicateTradeIds.includes(trade.externalId);
                        return (
                          <TableRow key={trade.externalId} className={isDup ? "opacity-60" : ""}>
                            <TableCell className="font-mono text-xs">
                              {trade.externalId}
                              {isDup ? (
                                <span className="ml-1.5 rounded-[var(--radius-sm)] bg-amber-500/10 px-1 py-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                                  Duplicate
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell className="font-semibold">{trade.symbol}</TableCell>
                            <TableCell>
                              <span
                                className={`rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                  trade.side === "buy"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {trade.side}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted tabular-nums">
                              {trade.activityDate}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {trade.quantity}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {trade.openPrice}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {trade.closePrice}
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums text-muted">
                              {formatMinor(trade.commissionMinor + trade.swapMinor, trade.currency)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-semibold tabular-nums ${
                                trade.netPnlMinor >= 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {formatMinor(trade.netPnlMinor, trade.currency)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Open Positions Table */}
            {activeTab === "positions" && (
              <div className="max-h-96 overflow-auto rounded-[var(--radius-md)] border border-border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Open Date</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Entry Price</TableHead>
                      <TableHead className="text-right">SL</TableHead>
                      <TableHead className="text-right">TP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.parseResult.openPositions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-xs text-muted">
                          No open positions found in statement.
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewData.parseResult.openPositions.map((pos) => {
                        const isDup = previewData.duplicatePositionIds.includes(pos.externalId);
                        return (
                          <TableRow key={pos.externalId} className={isDup ? "opacity-60" : ""}>
                            <TableCell className="font-mono text-xs">
                              {pos.externalId}
                              {isDup ? (
                                <span className="ml-1.5 rounded-[var(--radius-sm)] bg-amber-500/10 px-1 py-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                                  Duplicate
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell className="font-semibold">{pos.symbol}</TableCell>
                            <TableCell>
                              <span
                                className={`rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                  pos.side === "buy"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {pos.side}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted tabular-nums">
                              {pos.activityDate}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {pos.quantity}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {pos.openPrice}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs tabular-nums text-muted">
                              {pos.stopLoss || "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs tabular-nums text-muted">
                              {pos.takeProfit || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Cash Moves Table */}
            {activeTab === "cash" && (
              <div className="max-h-96 overflow-auto rounded-[var(--radius-md)] border border-border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.parseResult.cashMoves.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-xs text-muted">
                          No cash deposits or withdrawals found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewData.parseResult.cashMoves.map((m, idx) => (
                        <TableRow key={m.externalId || idx}>
                          <TableCell className="font-semibold uppercase text-xs">
                            {m.type}
                          </TableCell>
                          <TableCell className="text-xs text-muted tabular-nums">
                            {m.activityDate}
                          </TableCell>
                          <TableCell className="text-xs text-foreground">{m.notes}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatMinor(m.amountMinor, m.currency)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Symbols Table */}
            {activeTab === "symbols" && (
              <div className="max-h-96 overflow-auto rounded-[var(--radius-md)] border border-border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Kind</TableHead>
                      <TableHead>Status in Workspace</TableHead>
                      <TableHead className="text-right">Contract Size</TableHead>
                      <TableHead className="text-right">Total Trades / Positions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.symbolsSummary.map((s) => (
                      <TableRow key={s.symbol}>
                        <TableCell className="font-semibold">{s.symbol}</TableCell>
                        <TableCell>
                          <span className="rounded-[var(--radius-sm)] bg-muted px-2 py-0.5 text-xs uppercase text-muted-foreground">
                            {s.kind}
                          </span>
                        </TableCell>
                        <TableCell>
                          {s.exists ? (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              ✓ Existing instrument
                            </span>
                          ) : (
                            <span className="text-xs text-primary font-medium">
                              + Will be created
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {s.contractSize}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted">
                          {s.tradesCount} trades, {s.positionsCount} positions
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setStep("upload")}>
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={loading}
              onClick={() => void handleCommit()}
            >
              {loading ? "Importing activities…" : "Confirm & Import Activities"}
            </Button>
          </div>
        </div>
      ) : null}

      {/* STEP 4: SUCCESS */}
      {step === "success" && importResult ? (
        <div className="mt-8 rounded-[var(--radius-md)] border border-border bg-background p-8 text-center space-y-6">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground">Statement imported successfully</h3>
            <p className="mt-1 text-sm text-muted">
              Activities have been recorded to your Investment journal and Money ledger.
            </p>
          </div>

          <div className="mx-auto grid max-w-md grid-cols-3 gap-3">
            <div className="rounded-[var(--radius-sm)] border border-border bg-muted/20 p-3">
              <div className="text-xs text-muted">Closed Trades</div>
              <div className="mt-1 text-lg font-bold tabular-nums text-foreground">
                {importResult.importedTradesCount}
              </div>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-border bg-muted/20 p-3">
              <div className="text-xs text-muted">Open Positions</div>
              <div className="mt-1 text-lg font-bold tabular-nums text-foreground">
                {importResult.importedPositionsCount}
              </div>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-border bg-muted/20 p-3">
              <div className="text-xs text-muted">New Instruments</div>
              <div className="mt-1 text-lg font-bold tabular-nums text-foreground">
                {importResult.createdInstrumentsCount}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={resetImport}>
              Import another file
            </Button>
            <Link
              href="/investments"
              className={buttonClassName({ variant: "primary" })}
            >
              View Investments
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
