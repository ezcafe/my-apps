"use client";

import {
  INVESTMENT_INSTRUMENT_KINDS,
  investmentInstrumentKindLabel,
  type InvestmentInstrumentKind,
} from "@/lib/investment-instrument-kind";
import { PRICE_CURRENCIES } from "@/lib/investment-fx";
import { moneyQuickPickChipCls, moneyQuickPickGroupCls } from "@/lib/money-quick-pick-chip-cls";

export function InstrumentKindChips({
  value,
  onChange,
}: {
  value: InvestmentInstrumentKind;
  onChange: (kind: InvestmentInstrumentKind) => void;
}) {
  return (
    <fieldset className="grid min-w-0 gap-1.5 text-sm">
      <legend className="text-muted">
        <span className="text-foreground" aria-hidden>
          *
        </span>{" "}
        Kind
      </legend>
      <div role="radiogroup" aria-label="Kind" className={moneyQuickPickGroupCls}>
        {INVESTMENT_INSTRUMENT_KINDS.map((kind) => {
          const active = value === kind;
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(kind)}
              className={moneyQuickPickChipCls(active)}
            >
              {investmentInstrumentKindLabel(kind)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function InstrumentCurrencyChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (currency: string) => void;
}) {
  return (
    <fieldset className="grid min-w-0 gap-1.5 text-sm">
      <legend className="text-muted">
        <span className="text-foreground" aria-hidden>
          *
        </span>{" "}
        Currency
      </legend>
      <div
        role="radiogroup"
        aria-label="Instrument currency"
        className={moneyQuickPickGroupCls}
      >
        {PRICE_CURRENCIES.map((code) => {
          const active = value === code;
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(code)}
              className={moneyQuickPickChipCls(active)}
            >
              {code}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
