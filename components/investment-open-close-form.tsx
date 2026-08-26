"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InvestmentDirectionChips, type TradeSide } from "@/components/investment-direction-chips";
import { InvestmentFxRateField } from "@/components/investment-fx-rate-field";
import {
  CREATE_SYMBOL_ID,
  defaultNewInstrumentCurrency,
  InvestmentSymbolQuickPick,
  type InstrumentKind,
} from "@/components/investment-symbol-quick-pick";
import { MoneyInputGroup } from "@/components/money-input-group";
import {
  localDateString,
  MoneyDateQuickPick,
} from "@/components/money-date-quick-pick";
import { MoneyLookupQuickPickSkeleton } from "@/components/money-dashboard-skeleton";
import { MoneyUsageQuickPick } from "@/components/money-usage-quick-pick";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { InstrumentLedgerDefaultsFields } from "@/components/instrument-ledger-defaults-fields";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { formatQuantityDisplay } from "@/lib/investment-services/positions";
import { parseMajorToMinor } from "@/lib/format-money";
import { defaultContractSize } from "@/lib/investment-contract-size";
import { convertSignedMajorToMinor } from "@/lib/investment-fx";
import { investmentGraphQLRequest } from "@/lib/investment-gql-client";
import {
  INVESTMENT_ACTIVITY_CLOSE_MUTATION,
  INVESTMENT_ACTIVITY_CREATE_MUTATION,
  INVESTMENT_ACTIVITY_REALIZE_MUTATION,
  INVESTMENT_INSTRUMENT_CREATE_MUTATION,
} from "@/lib/investment-gql-documents";
import {
  investmentFxRateQueryOptions,
  investmentInstrumentsQueryOptions,
  investmentOpenActivitiesQueryOptions,
  investmentTopQuantitiesQueryOptions,
} from "@/lib/investment-query-options";
import { instrumentLedgerPrefill } from "@/lib/instrument-ledger-prefill";
import { previewTradeResult } from "@/lib/investment-realized-pnl";
import { categoriesOfKind } from "@/lib/money-category-ui";
import { moneyQuickPickChipCls, moneyQuickPickGroupCls } from "@/lib/money-quick-pick-chip-cls";
import {
  invalidateMoneyWorkspaceQueries,
  moneyFormLookupsQueryOptions,
} from "@/lib/money-query-options";
import { toUserFacingMessage } from "@/lib/user-facing-error";
import { useNotify } from "@/components/notification-provider";

const FORM_MODES = [
  { value: "trade", label: "Trade" },
  { value: "open", label: "Open" },
  { value: "close", label: "Close" },
] as const;

const MODE_HINTS: Record<FormMode, string> = {
  trade: "Buy or sell in one step — cash and P&L post immediately.",
  open: "Start an open lot; cash books when you close it.",
  close: "Close an open lot and realize P&L.",
};

type FormMode = (typeof FORM_MODES)[number]["value"];

export function InvestmentOpenCloseForm({
  initialInstrumentId,
  initialMode,
  initialOpenActivityId,
}: {
  initialInstrumentId?: string | null;
  initialMode?: string | null;
  initialOpenActivityId?: string | null;
}) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { workspaceReady, defaultCurrency } = useWorkspaceCurrency();

  const lookups = useQuery({
    ...moneyFormLookupsQueryOptions(),
    enabled: workspaceReady,
  });
  const instrumentsQuery = useQuery({
    ...investmentInstrumentsQueryOptions(),
    enabled: workspaceReady,
  });
  const openQuery = useQuery({
    ...investmentOpenActivitiesQueryOptions(),
    enabled: workspaceReady,
  });
  const topQuantitiesQuery = useQuery({
    ...investmentTopQuantitiesQueryOptions(),
    enabled: workspaceReady,
  });

  const accounts = useMemo(
    () => lookups.data?.moneyAccounts ?? [],
    [lookups.data?.moneyAccounts],
  );
  const categories = useMemo(
    () => lookups.data?.moneyCategories ?? [],
    [lookups.data?.moneyCategories],
  );
  const topQuantities = useMemo(
    () => topQuantitiesQuery.data ?? [],
    [topQuantitiesQuery.data],
  );
  const [mode, setMode] = useState<FormMode>(() =>
    initialMode === "trade" || initialMode === "open" || initialMode === "close"
      ? initialMode
      : "trade",
  );
  const [instrumentId, setInstrumentId] = useState(
    () => initialInstrumentId ?? "",
  );
  const [createNewInstrument, setCreateNewInstrument] = useState(false);
  const [newKind, setNewKind] = useState<InstrumentKind>("stocks");
  const [newSymbol, setNewSymbol] = useState("");
  const [newContractSize, setNewContractSize] = useState("1");
  const [newCurrency, setNewCurrency] = useState(() =>
    defaultNewInstrumentCurrency(defaultCurrency),
  );
  const [newMoneyAccountId, setNewMoneyAccountId] = useState("");
  const [newIncomeCategoryId, setNewIncomeCategoryId] = useState("");
  const [newExpenseCategoryId, setNewExpenseCategoryId] = useState("");
  const [closeCategoryId, setCloseCategoryId] = useState("");
  const [side, setSide] = useState<TradeSide>("buy");
  const [quantity, setQuantity] = useState("");
  const [openPrice, setOpenPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [notes, setNotes] = useState("");
  const [activityDate, setActivityDate] = useState(localDateString);
  const [openActivityId, setOpenActivityId] = useState(
    () => initialOpenActivityId ?? "",
  );
  const [closePrice, setClosePrice] = useState("");
  const [closeFee, setCloseFee] = useState("");
  const [rateDraft, setRateDraft] = useState("1");
  const [rateTouched, setRateTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeInstruments =
    instrumentsQuery.data?.filter((i) => !i.archived) ?? [];
  const selectedOpen = openQuery.data?.find((r) => r.id === openActivityId);
  const selectedInstrument = activeInstruments.find((i) => i.id === instrumentId);
  const closeInstrument = instrumentsQuery.data?.find(
    (i) => i.id === selectedOpen?.instrumentId,
  );
  const priceCurrency =
    mode === "close"
      ? selectedOpen?.instrumentCurrency?.trim().toUpperCase() || null
      : createNewInstrument
        ? newCurrency
        : selectedInstrument?.currency?.trim().toUpperCase() || null;
  const workspaceCurrency = defaultCurrency.trim().toUpperCase();
  const needsFx =
    (mode === "close" || mode === "trade") &&
    priceCurrency != null &&
    priceCurrency !== workspaceCurrency;
  const fxQuery = useQuery({
    ...investmentFxRateQueryOptions(
      priceCurrency ?? workspaceCurrency,
      workspaceCurrency,
    ),
    enabled: workspaceReady && needsFx && priceCurrency != null,
  });
  const rateInput = !needsFx
    ? "1"
    : rateTouched
      ? rateDraft
      : fxQuery.data?.rate != null
        ? String(fxQuery.data.rate)
        : rateDraft;
  const effectiveRate = useMemo(() => {
    if (!needsFx) return 1;
    const n = Number(rateInput.replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [needsFx, rateInput]);

  const contractSizeForPreview =
    mode === "close"
      ? closeInstrument?.contractSize ?? "1"
      : createNewInstrument
        ? newContractSize.trim() || "1"
        : selectedInstrument?.contractSize ?? "1";

  const closePnlSign = useMemo(() => {
    if (mode !== "close" && mode !== "trade") return null;
    const feeCurrency = priceCurrency ?? defaultCurrency;
    const feeMinor =
      closeFee.trim() === ""
        ? 0
        : parseMajorToMinor(closeFee, feeCurrency);
    if (feeMinor == null) return null;

    let lots: number;
    let open: number;
    let close: number;
    let tradeSide: TradeSide;
    if (mode === "close") {
      if (!selectedOpen) return null;
      lots = Number(selectedOpen.quantity);
      open = Number(selectedOpen.openPrice);
      close = Number(closePrice);
      tradeSide = selectedOpen.type === "sell" ? "sell" : "buy";
    } else {
      lots = Number(quantity);
      open = Number(openPrice);
      close = Number(closePrice);
      tradeSide = side;
    }

    const preview = previewTradeResult({
      side: tradeSide,
      lots,
      contractSize: contractSizeForPreview,
      openPrice: open,
      closePrice: close,
      closeFeeMinor: feeMinor,
      currency: feeCurrency,
    });
    if (!preview || effectiveRate == null) return null;
    try {
      return convertSignedMajorToMinor({
        fromMajor: preview.signedMajor,
        fromCurrency: feeCurrency,
        toCurrency: workspaceCurrency,
        rateToPerFrom: effectiveRate,
      });
    } catch {
      return preview.signedMajor;
    }
  }, [
    closeFee,
    closePrice,
    contractSizeForPreview,
    defaultCurrency,
    effectiveRate,
    mode,
    openPrice,
    priceCurrency,
    quantity,
    selectedOpen,
    side,
    workspaceCurrency,
  ]);

  const ledgerInstrument = mode === "close" ? closeInstrument : selectedInstrument;
  const closePrefill = instrumentLedgerPrefill(
    ledgerInstrument
      ? {
          moneyAccountId: ledgerInstrument.moneyAccountId,
          incomeCategoryId: ledgerInstrument.incomeCategoryId,
          expenseCategoryId: ledgerInstrument.expenseCategoryId,
        }
      : createNewInstrument && mode === "trade"
        ? {
            moneyAccountId: newMoneyAccountId || null,
            incomeCategoryId: newIncomeCategoryId || null,
            expenseCategoryId: newExpenseCategoryId || null,
          }
        : null,
    closePnlSign,
  );
  const closeCategoryKind =
    closePnlSign == null ? null : closePnlSign >= 0 ? "income" : "expense";
  const closeCategoryValid =
    closeCategoryKind != null &&
    categoriesOfKind(categories, closeCategoryKind).some(
      (c) => c.id === closeCategoryId,
    );
  const effectiveCloseCategoryId = closeCategoryValid
    ? closeCategoryId
    : closePrefill.categoryId ?? "";

  const openActivityItems = useMemo(
    () =>
      (openQuery.data ?? []).map((row) => ({
        id: row.id,
        label: `${row.instrumentSymbol} · ${row.type} · ${row.quantity ?? "?"} @ ${row.openPrice ?? "?"}`,
      })),
    [openQuery.data],
  );

  async function ensureInstrumentId(): Promise<string> {
    if (!createNewInstrument) {
      if (!instrumentId) throw new Error("Select or create a symbol.");
      return instrumentId;
    }
    const symbol = newSymbol.trim();
    if (!symbol) {
      throw new Error("Enter a symbol for the new instrument.");
    }
    if (!newMoneyAccountId || !newIncomeCategoryId || !newExpenseCategoryId) {
      throw new Error(
        "Pick an account, profit category, and loss category for the new symbol.",
      );
    }
    const created = await investmentGraphQLRequest<{
      investmentInstrumentCreate: { id: string };
    }>(INVESTMENT_INSTRUMENT_CREATE_MUTATION, {
      input: {
        kind: newKind,
        symbol,
        currency: newCurrency,
        contractSize:
          newContractSize.trim() || defaultContractSize(newKind, symbol),
        moneyAccountId: newMoneyAccountId,
        incomeCategoryId: newIncomeCategoryId,
        expenseCategoryId: newExpenseCategoryId,
      },
    });
    const resolvedInstrumentId = created.investmentInstrumentCreate.id;
    setInstrumentId(resolvedInstrumentId);
    setCreateNewInstrument(false);
    return resolvedInstrumentId;
  }

  function parseFeeMinor(currency: string): number {
    const feeMinor =
      closeFee.trim() === "" ? 0 : parseMajorToMinor(closeFee, currency);
    if (feeMinor == null || feeMinor < 0) {
      throw new Error("Fee cannot be negative.");
    }
    return feeMinor;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "close") {
        if (!openActivityId) throw new Error("Pick an open activity.");
        const close = Number(closePrice);
        if (!Number.isFinite(close) || close <= 0) {
          throw new Error("Close price must be positive.");
        }
        const feeCurrency = priceCurrency ?? defaultCurrency;
        const feeMinor = parseFeeMinor(feeCurrency);
        if (effectiveRate == null) {
          throw new Error("Enter a positive FX rate to the workspace currency.");
        }
        await investmentGraphQLRequest(INVESTMENT_ACTIVITY_CLOSE_MUTATION, {
          input: {
            id: openActivityId,
            closePrice: closePrice.trim(),
            feeMinor,
            activityDate,
            notes: notes.trim() || null,
            categoryId: effectiveCloseCategoryId || null,
            fxRate: effectiveRate,
          },
        });
        notify.success("Activity closed", "P&L was posted to Money.");
        setOpenActivityId("");
        setClosePrice("");
        setCloseFee("");
      } else if (mode === "trade") {
        const resolvedInstrumentId = await ensureInstrumentId();
        if (!priceCurrency) {
          throw new Error("Select a symbol so its currency can be used.");
        }
        const vol = Number(quantity);
        const open = Number(openPrice);
        const close = Number(closePrice);
        if (!Number.isFinite(vol) || vol <= 0) {
          throw new Error("Quantity must be positive.");
        }
        if (!Number.isFinite(open) || open <= 0) {
          throw new Error("Open price must be positive.");
        }
        if (!Number.isFinite(close) || close <= 0) {
          throw new Error("Close price must be positive.");
        }
        if (effectiveRate == null) {
          throw new Error("Enter a positive FX rate to the workspace currency.");
        }
        const feeMinor = parseFeeMinor(priceCurrency);
        await investmentGraphQLRequest(INVESTMENT_ACTIVITY_REALIZE_MUTATION, {
          input: {
            instrumentId: resolvedInstrumentId,
            activityDate,
            type: side,
            priceCurrency,
            fxRate: effectiveRate,
            quantity: quantity.trim(),
            openPrice: openPrice.trim(),
            closePrice: closePrice.trim(),
            feeMinor,
            notes: notes.trim() || null,
            categoryId: effectiveCloseCategoryId || null,
          },
        });
        notify.success("Trade saved", "P&L was posted to Money.");
        setQuantity("");
        setOpenPrice("");
        setClosePrice("");
        setCloseFee("");
      } else {
        const resolvedInstrumentId = await ensureInstrumentId();
        const vol = Number(quantity);
        const price = Number(openPrice);
        if (!Number.isFinite(vol) || vol <= 0) {
          throw new Error("Quantity must be positive.");
        }
        if (!Number.isFinite(price) || price <= 0) {
          throw new Error("Open price must be positive.");
        }
        await investmentGraphQLRequest(INVESTMENT_ACTIVITY_CREATE_MUTATION, {
          input: {
            instrumentId: resolvedInstrumentId,
            activityDate,
            type: side,
            quantity: quantity.trim(),
            openPrice: openPrice.trim(),
            stopLoss: stopLoss.trim() || null,
            takeProfit: takeProfit.trim() || null,
            amountMinor: 0,
            notes: notes.trim() || null,
          },
        });
        notify.success("Position opened", "No cash was booked yet.");
        setQuantity("");
        setOpenPrice("");
        setStopLoss("");
        setTakeProfit("");
      }
      await invalidateMoneyWorkspaceQueries(queryClient);
    } catch (err) {
      notify.error(
        "Couldn’t save activity",
        toUserFacingMessage(err, "Something went wrong"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const lookupsPending =
    !workspaceReady || instrumentsQuery.isPending || lookups.isPending;
  const openPending = !workspaceReady || openQuery.isPending;

  const fxHint = fxQuery.isError
    ? "Could not fetch Yahoo rate. Enter it yourself."
    : fxQuery.isFetching
      ? "Fetching rate…"
      : "Override if needed.";

  const feeHint = priceCurrency
    ? `Optional, in ${priceCurrency}. Includes commission.`
    : "Optional. Includes commission.";

  const submitLabel = submitting
    ? "Saving…"
    : mode === "trade"
      ? "Record trade"
      : mode === "open"
        ? "Open position"
        : "Close position";
  const submitHint =
    mode === "open"
      ? "No cash booked until you close the lot."
      : "Posts profit as income or loss as expense.";

  return (
    <form
      className="grid min-w-0 gap-4 [&>*]:col-span-full"
      style={{
        gridTemplateColumns:
          "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
      }}
      onSubmit={(e) => void onSubmit(e)}
    >
      <fieldset className="grid min-w-0 gap-1.5 text-sm">
        <legend className="text-muted">What are you doing?</legend>
        <div
          role="radiogroup"
          aria-label="What are you doing?"
          className={moneyQuickPickGroupCls}
        >
          {FORM_MODES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              className={moneyQuickPickChipCls(mode === value)}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">{MODE_HINTS[mode]}</p>
      </fieldset>

      {mode === "close" ? (
        <>
          {openPending ? (
            <MoneyLookupQuickPickSkeleton legend="Open activity" required />
          ) : (
            <MoneyUsageQuickPick
              legend="Open activity"
              ariaLabel="Open activity"
              required
              items={openActivityItems}
              selectedId={openActivityId}
              onSelect={(id) => {
                setRateTouched(false);
                setRateDraft("1");
                setOpenActivityId(id);
              }}
              otherLabel="Other activity"
              searchPlaceholder="Search open activities…"
              emptyMessage="No open activities to close."
            />
          )}
          {selectedOpen ? (
            <p className="text-sm text-muted">
              SL {selectedOpen.stopLoss ?? "—"} · TP {selectedOpen.takeProfit ?? "—"}
            </p>
          ) : null}
          <Field label="Close price" required>
            <MoneyInputGroup
              variant="currency"
              currency={priceCurrency}
              value={closePrice}
              onChange={setClosePrice}
              required
              aria-label="Close price"
            />
          </Field>
          <Field label="Fee" hint={feeHint}>
            <MoneyInputGroup
              variant="currency"
              currency={priceCurrency}
              value={closeFee}
              onChange={setCloseFee}
              aria-label="Fee"
            />
          </Field>
          {needsFx && priceCurrency ? (
            <InvestmentFxRateField
              fromCurrency={priceCurrency}
              toCurrency={workspaceCurrency}
              value={rateInput}
              onChange={(next) => {
                setRateTouched(true);
                setRateDraft(next);
              }}
              hint={fxHint}
              required
            />
          ) : null}
          {closePnlSign != null ? (
            lookupsPending ? (
              <MoneyLookupQuickPickSkeleton legend="Category" />
            ) : (
              <MoneyUsageQuickPick
                legend="Category"
                ariaLabel="Category"
                items={categoriesOfKind(
                  categories,
                  closePnlSign >= 0 ? "income" : "expense",
                ).map((c) => ({
                  id: c.id,
                  label: c.name,
                  usageCount: c.usageCount,
                }))}
                selectedId={effectiveCloseCategoryId}
                onSelect={setCloseCategoryId}
                otherLabel="Other category"
                searchPlaceholder="Search categories…"
                emptyMessage="No categories yet."
              />
            )
          ) : null}
        </>
      ) : (
        <>
          {lookupsPending ? (
            <MoneyLookupQuickPickSkeleton legend="Symbol" required />
          ) : (
            <InvestmentSymbolQuickPick
              instruments={activeInstruments}
              selectedId={instrumentId}
              createNew={createNewInstrument}
              onSelect={(id) => {
                setRateTouched(false);
                setRateDraft("1");
                if (id === CREATE_SYMBOL_ID) {
                  setCreateNewInstrument(true);
                  setInstrumentId("");
                  return;
                }
                setCreateNewInstrument(false);
                setInstrumentId(id);
              }}
              newKind={newKind}
              newSymbol={newSymbol}
              newContractSize={newContractSize}
              newCurrency={newCurrency}
              onNewKind={setNewKind}
              onNewSymbol={setNewSymbol}
              onNewContractSize={setNewContractSize}
              onNewCurrency={(code) => {
                setRateTouched(false);
                setRateDraft("1");
                setNewCurrency(code);
              }}
              createExtras={
                <InstrumentLedgerDefaultsFields
                  accounts={accounts}
                  categories={categories}
                  moneyAccountId={newMoneyAccountId}
                  incomeCategoryId={newIncomeCategoryId}
                  expenseCategoryId={newExpenseCategoryId}
                  onMoneyAccountId={setNewMoneyAccountId}
                  onIncomeCategoryId={setNewIncomeCategoryId}
                  onExpenseCategoryId={setNewExpenseCategoryId}
                />
              }
            />
          )}
          <InvestmentDirectionChips value={side} onChange={setSide} required />
          <Field
            label="Quantity"
            hint="Contract size comes from the instrument."
            required
          >
            <MoneyInputGroup
              variant="unit"
              unit="Lots"
              value={quantity}
              onChange={setQuantity}
              required
              aria-label="Quantity"
            />
            {topQuantities.length > 0 ? (
              <>
                <p className="text-sm text-muted">
                  Tap a recent quantity to fill · last 90 days
                </p>
                <div
                  role="group"
                  aria-label="Recent quantities"
                  className="flex min-w-0 flex-wrap gap-1.5"
                >
                  {topQuantities.map((row) => {
                    const label = formatQuantityDisplay(row.quantity);
                    return (
                    <button
                      key={row.quantity}
                      type="button"
                      onClick={() => setQuantity(label)}
                      title={`Use ${label} lots`}
                      className={cn(
                        "cursor-pointer rounded-[var(--radius-sm)] border border-dashed border-border px-2.5 py-1 text-sm font-medium tabular-nums text-foreground underline decoration-transparent underline-offset-2 transition-[background-color,border-color,color,text-decoration-color] duration-200 hover:border-foreground/25 hover:bg-muted-surface hover:decoration-foreground/40 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring fx-press",
                      )}
                    >
                      {label}
                    </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </Field>
          <Field label="Open price" required>
            <MoneyInputGroup
              variant="currency"
              currency={priceCurrency}
              value={openPrice}
              onChange={setOpenPrice}
              required
              aria-label="Open price"
            />
          </Field>
          {mode === "trade" ? (
            <>
              <Field label="Close price" required>
                <MoneyInputGroup
                  variant="currency"
                  currency={priceCurrency}
                  value={closePrice}
                  onChange={setClosePrice}
                  required
                  aria-label="Close price"
                />
              </Field>
              <Field label="Fee" hint={feeHint}>
                <MoneyInputGroup
                  variant="currency"
                  currency={priceCurrency}
                  value={closeFee}
                  onChange={setCloseFee}
                  aria-label="Fee"
                />
              </Field>
              {needsFx && priceCurrency ? (
                <InvestmentFxRateField
                  fromCurrency={priceCurrency}
                  toCurrency={workspaceCurrency}
                  value={rateInput}
                  onChange={(next) => {
                    setRateTouched(true);
                    setRateDraft(next);
                  }}
                  hint={fxHint}
                  required
                />
              ) : null}
              {closePnlSign != null ? (
                lookupsPending ? (
                  <MoneyLookupQuickPickSkeleton legend="Category" />
                ) : (
                  <MoneyUsageQuickPick
                    legend="Category"
                    ariaLabel="Category"
                    items={categoriesOfKind(
                      categories,
                      closePnlSign >= 0 ? "income" : "expense",
                    ).map((c) => ({
                      id: c.id,
                      label: c.name,
                      usageCount: c.usageCount,
                    }))}
                    selectedId={effectiveCloseCategoryId}
                    onSelect={setCloseCategoryId}
                    otherLabel="Other category"
                    searchPlaceholder="Search categories…"
                    emptyMessage="No categories yet."
                  />
                )
              ) : null}
            </>
          ) : (
            <>
              <Field label="Stop loss">
                <MoneyInputGroup
                  variant="currency"
                  currency={priceCurrency}
                  value={stopLoss}
                  onChange={setStopLoss}
                  aria-label="Stop loss"
                />
              </Field>
              <Field label="Take profit">
                <MoneyInputGroup
                  variant="currency"
                  currency={priceCurrency}
                  value={takeProfit}
                  onChange={setTakeProfit}
                  aria-label="Take profit"
                />
              </Field>
            </>
          )}
        </>
      )}

      <MoneyDateQuickPick
        legend="When"
        ariaLabel="Activity date"
        value={activityDate}
        onChange={setActivityDate}
      />
      <Field label="Notes">
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 [grid-column:1/-1]">
        <Button
          type="submit"
          size="sm"
          disabled={submitting || !workspaceReady}
          aria-busy={submitting}
        >
          {submitLabel}
        </Button>
        <span aria-live="polite" className="text-sm text-muted">
          {submitHint}
        </span>
      </div>
    </form>
  );
}
