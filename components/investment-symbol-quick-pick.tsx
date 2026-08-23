"use client";

import { useMemo, type ReactNode } from "react";
import {
  InstrumentCurrencyChips,
  InstrumentKindChips,
} from "@/components/instrument-kind-currency-chips";
import { MoneyUsageQuickPick } from "@/components/money-usage-quick-pick";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { defaultContractSize } from "@/lib/investment-contract-size";
import { isPriceCurrency } from "@/lib/investment-fx";
import {
  INVESTMENT_INSTRUMENT_KINDS,
  type InvestmentInstrumentKind,
} from "@/lib/investment-instrument-kind";
import type { InvestmentInstrument } from "@/lib/investment-query-options";
import type { UsageRankedItem } from "@/lib/money-usage-quick-pick";

export const CREATE_SYMBOL_ID = "__new__";
export const INSTRUMENT_KINDS = INVESTMENT_INSTRUMENT_KINDS;
export type InstrumentKind = InvestmentInstrumentKind;

const PINNED_CREATE: UsageRankedItem = {
  id: CREATE_SYMBOL_ID,
  label: "Create new symbol",
};

export function InvestmentSymbolQuickPick({
  instruments,
  selectedId,
  onSelect,
  createNew,
  newKind,
  newSymbol,
  newContractSize,
  newCurrency,
  onNewKind,
  onNewSymbol,
  onNewContractSize,
  onNewCurrency,
  createExtras,
  emptyMessage = "No symbols yet.",
}: {
  instruments: readonly InvestmentInstrument[];
  selectedId: string;
  onSelect: (id: string) => void;
  createNew: boolean;
  newKind: InstrumentKind;
  newSymbol: string;
  newContractSize: string;
  newCurrency: string;
  onNewKind: (kind: InstrumentKind) => void;
  onNewSymbol: (value: string) => void;
  onNewContractSize: (value: string) => void;
  onNewCurrency: (value: string) => void;
  createExtras?: ReactNode;
  emptyMessage?: string;
}) {
  const items = useMemo(
    () =>
      instruments.map((i) => ({
        id: i.id,
        label: i.symbol,
      })),
    [instruments],
  );
  const pickerValue = createNew ? CREATE_SYMBOL_ID : selectedId;

  return (
    <div className="grid min-w-0 gap-4">
      <MoneyUsageQuickPick
        legend="Symbol"
        ariaLabel="Symbol"
        required
        items={items}
        selectedId={pickerValue}
        onSelect={(id) => onSelect(id)}
        otherLabel="Other symbol"
        searchPlaceholder="Search symbols…"
        pinnedItems={[PINNED_CREATE]}
        emptyMessage={emptyMessage}
      />
      {createNew ? (
        <>
          <InstrumentKindChips
            value={newKind}
            onChange={(kind) => {
              onNewKind(kind);
              onNewContractSize(defaultContractSize(kind, newSymbol));
            }}
          />
          <Field label="Symbol" required>
            <Input
              value={newSymbol}
              onChange={(e) => {
                onNewSymbol(e.target.value);
                onNewContractSize(defaultContractSize(newKind, e.target.value));
              }}
              autoComplete="off"
            />
          </Field>
          <Field
            label="Contract size"
            hint="Stored on the instrument. Used for P&L; not entered per trade."
            required
          >
            <Input
              inputMode="decimal"
              value={newContractSize}
              onChange={(e) => onNewContractSize(e.target.value)}
            />
          </Field>
          <InstrumentCurrencyChips value={newCurrency} onChange={onNewCurrency} />
          {createExtras}
        </>
      ) : null}
    </div>
  );
}

export function defaultNewInstrumentCurrency(workspaceCurrency: string): string {
  return isPriceCurrency(workspaceCurrency)
    ? workspaceCurrency.toUpperCase()
    : "USD";
}
