"use client";

import { useEffect, useImperativeHandle, useMemo, useState, type RefObject } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { InstrumentLedgerDefaultsFields } from "@/components/instrument-ledger-defaults-fields";
import { InvestmentFxRateField } from "@/components/investment-fx-rate-field";
import { InvestmentDirectionChips, type TradeSide } from "@/components/investment-direction-chips";
import {
  CREATE_SYMBOL_ID,
  defaultNewInstrumentCurrency,
  InvestmentSymbolQuickPick,
  type InstrumentKind,
} from "@/components/investment-symbol-quick-pick";
import { MoneyInputGroup } from "@/components/money-input-group";
import {
  MoneyLookupQuickPickSkeleton,
} from "@/components/money-dashboard-skeleton";
import { useNotify } from "@/components/notification-provider";
import { parseMajorToMinor } from "@/lib/format-money";
import { investmentGraphQLRequest } from "@/lib/investment-gql-client";
import {
  INVESTMENT_ACTIVITY_REALIZE_MUTATION,
  INVESTMENT_INSTRUMENT_CREATE_MUTATION,
} from "@/lib/investment-gql-documents";
import {
  investmentFxRateQueryOptions,
  investmentInstrumentsQueryOptions,
} from "@/lib/investment-query-options";
import { defaultContractSize } from "@/lib/investment-contract-size";
import {
  type InstrumentLedgerDefaults,
} from "@/lib/instrument-ledger-prefill";
import { convertSignedMajorToMinor } from "@/lib/investment-fx";
import { previewTradeResult } from "@/lib/investment-realized-pnl";
import {
  invalidateMoneyWorkspaceQueries,
  moneyFormLookupsQueryOptions,
} from "@/lib/money-query-options";
import { toUserFacingMessage } from "@/lib/user-facing-error";

export type InvestmentActivitySaveContext = {
  activityDate: string;
  moneyAccountId: string;
  categoryId: string | null;
  notes: string | null;
  defaultCurrency: string;
  amountMinor: number | null;
};

export type InvestmentActivityFieldsHandle = {
  save: (ctx: InvestmentActivitySaveContext) => Promise<void>;
  resetAmounts: () => void;
};

export function InvestmentActivityFields({
  workspaceReady,
  initialInstrumentId,
  saveRef,
  defaultCurrency,
  onPreviewChange,
  onLedgerDefaultsChange,
}: {
  workspaceReady: boolean;
  initialInstrumentId?: string | null;
  saveRef: RefObject<InvestmentActivityFieldsHandle | null>;
  defaultCurrency: string;
  onPreviewChange?: (
    result: { signedMinor: number; signedMajor: number } | null,
  ) => void;
  onLedgerDefaultsChange?: (defaults: InstrumentLedgerDefaults | null) => void;
}) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const instrumentsQuery = useQuery({
    ...investmentInstrumentsQueryOptions(),
    enabled: workspaceReady,
  });

  const activeInstruments = useMemo(
    () => instrumentsQuery.data?.filter((i) => !i.archived) ?? [],
    [instrumentsQuery.data],
  );

  const lookupsQuery = useQuery({
    ...moneyFormLookupsQueryOptions(),
    enabled: workspaceReady,
  });
  const accounts = lookupsQuery.data?.moneyAccounts ?? [];
  const categories = lookupsQuery.data?.moneyCategories ?? [];

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
  const [side, setSide] = useState<TradeSide>("buy");
  const [quantity, setQuantity] = useState("");
  const [openPrice, setOpenPrice] = useState("");
  const [closePrice, setClosePrice] = useState("");
  const [fee, setFee] = useState("");
  const [rateDraft, setRateDraft] = useState("1");
  const [rateTouched, setRateTouched] = useState(false);

  const workspaceCurrency = defaultCurrency.trim().toUpperCase();
  const selectedInstrument = instrumentsQuery.data?.find(
    (i) => i.id === instrumentId,
  );
  const ledgerDefaults: InstrumentLedgerDefaults | null = useMemo(() => {
    if (createNewInstrument) {
      return {
        moneyAccountId: newMoneyAccountId || null,
        incomeCategoryId: newIncomeCategoryId || null,
        expenseCategoryId: newExpenseCategoryId || null,
      };
    }
    if (!selectedInstrument) return null;
    return {
      moneyAccountId: selectedInstrument.moneyAccountId,
      incomeCategoryId: selectedInstrument.incomeCategoryId,
      expenseCategoryId: selectedInstrument.expenseCategoryId,
    };
  }, [
    createNewInstrument,
    newExpenseCategoryId,
    newIncomeCategoryId,
    newMoneyAccountId,
    selectedInstrument,
  ]);

  useEffect(() => {
    onLedgerDefaultsChange?.(ledgerDefaults);
  }, [ledgerDefaults, onLedgerDefaultsChange]);
  const priceCurrency = createNewInstrument
    ? newCurrency
    : selectedInstrument?.currency?.trim().toUpperCase() || null;
  const needsFx =
    priceCurrency != null && priceCurrency !== workspaceCurrency;
  const fxQuery = useQuery({
    ...investmentFxRateQueryOptions(priceCurrency ?? workspaceCurrency, workspaceCurrency),
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

  const contractSize = useMemo(() => {
    if (createNewInstrument) return newContractSize.trim() || "1";
    return (
      activeInstruments.find((i) => i.id === instrumentId)?.contractSize ?? "1"
    );
  }, [activeInstruments, createNewInstrument, instrumentId, newContractSize]);

  const preview = useMemo(() => {
    if (!priceCurrency) return null;
    const lots = Number(quantity);
    const open = Number(openPrice);
    const close = Number(closePrice);
    const feeMinor =
      fee.trim() === ""
        ? 0
        : parseMajorToMinor(fee, priceCurrency);
    if (feeMinor == null) return null;
    if (effectiveRate == null) return null;
    const inPrice = previewTradeResult({
      side,
      lots,
      contractSize,
      openPrice: open,
      closePrice: close,
      closeFeeMinor: feeMinor,
      currency: priceCurrency,
    });
    if (!inPrice) return null;
    try {
      const signedMinor = convertSignedMajorToMinor({
        fromMajor: inPrice.signedMajor,
        fromCurrency: priceCurrency,
        toCurrency: workspaceCurrency,
        rateToPerFrom: effectiveRate,
      });
      const signedMajor =
        priceCurrency === workspaceCurrency
          ? inPrice.signedMajor
          : inPrice.signedMajor * effectiveRate;
      return { signedMinor, signedMajor };
    } catch {
      return null;
    }
  }, [
    closePrice,
    contractSize,
    effectiveRate,
    fee,
    openPrice,
    priceCurrency,
    quantity,
    side,
    workspaceCurrency,
  ]);

  useEffect(() => {
    onPreviewChange?.(preview);
  }, [onPreviewChange, preview]);

  function resetAmounts() {
    setQuantity("");
    setOpenPrice("");
    setClosePrice("");
    setFee("");
  }

  useImperativeHandle(saveRef, () => ({
    resetAmounts,
    async save(ctx) {
      let resolvedInstrumentId = instrumentId;
      if (createNewInstrument) {
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
        resolvedInstrumentId = created.investmentInstrumentCreate.id;
        setInstrumentId(resolvedInstrumentId);
        setCreateNewInstrument(false);
      }

      if (!resolvedInstrumentId) {
        throw new Error("Select or create a symbol.");
      }
      if (!priceCurrency) {
        throw new Error("Select a symbol so its currency can be used.");
      }

      const feeMinor =
        fee.trim() === ""
          ? 0
          : parseMajorToMinor(fee, priceCurrency);
      if (feeMinor == null || feeMinor < 0) {
        throw new Error("Fee cannot be negative.");
      }
      if (effectiveRate == null) {
        throw new Error("Enter a positive FX rate to the workspace currency.");
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
      await investmentGraphQLRequest(INVESTMENT_ACTIVITY_REALIZE_MUTATION, {
        input: {
          instrumentId: resolvedInstrumentId,
          activityDate: ctx.activityDate,
          type: side,
          priceCurrency,
          fxRate: effectiveRate,
          quantity: quantity.trim(),
          openPrice: openPrice.trim(),
          closePrice: closePrice.trim(),
          feeMinor,
          notes: ctx.notes,
          moneyAccountId: ctx.moneyAccountId,
          categoryId: ctx.categoryId,
        },
      });
      notify.success("Trade saved", "P&L was posted to Money.");

      await invalidateMoneyWorkspaceQueries(queryClient);
      resetAmounts();
    },
  }));

  return (
    <div className="grid min-w-0 gap-4 [grid-column:1/-1]">
      {instrumentsQuery.isError ? (
        <Alert
          variant="error"
          title="Could not load instruments"
          description={toUserFacingMessage(instrumentsQuery.error)}
        />
      ) : null}
      <InvestmentDirectionChips value={side} onChange={setSide} />
      {!workspaceReady || instrumentsQuery.isPending ? (
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
      {needsFx && priceCurrency ? (
        <InvestmentFxRateField
          fromCurrency={priceCurrency}
          toCurrency={workspaceCurrency}
          value={rateInput}
          onChange={(next) => {
            setRateTouched(true);
            setRateDraft(next);
          }}
          hint={
            fxQuery.isError
              ? "Could not fetch Yahoo rate. Enter it yourself."
              : fxQuery.isFetching
                ? "Fetching rate…"
                : "Override if needed."
          }
          required
        />
      ) : null}
      <Field
        label="Fee"
        hint={
          priceCurrency
            ? `Optional, in ${priceCurrency}. Includes commission.`
            : "Optional. Includes commission."
        }
      >
        <MoneyInputGroup
          variant="currency"
          currency={priceCurrency}
          value={fee}
          onChange={setFee}
          aria-label="Fee"
        />
      </Field>
    </div>
  );
}
