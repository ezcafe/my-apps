"use client";

import { moneyQuickPickChipCls, moneyQuickPickGroupCls } from "@/lib/money-quick-pick-chip-cls";

export const TRADE_SIDES = ["buy", "sell"] as const;
export type TradeSide = (typeof TRADE_SIDES)[number];

export function InvestmentDirectionChips({
  value,
  onChange,
  required,
}: {
  value: TradeSide;
  onChange: (side: TradeSide) => void;
  required?: boolean;
}) {
  return (
    <fieldset className="grid min-w-0 gap-1.5 text-sm">
      <legend className="text-muted">
        {required ? (
          <>
            <span className="text-foreground" aria-hidden>
              *
            </span>{" "}
            Direction
          </>
        ) : (
          "Direction"
        )}
      </legend>
      <div
        role="radiogroup"
        aria-label="Trade direction"
        className={moneyQuickPickGroupCls}
      >
        {TRADE_SIDES.map((side) => {
          const active = value === side;
          return (
            <button
              key={side}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(side)}
              className={moneyQuickPickChipCls(active)}
            >
              {side === "buy" ? "Buy" : "Sell"}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
