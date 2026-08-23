"use client";

import type { ReactNode } from "react";
import { Field } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { fxRateInputAddons } from "@/lib/format-money";

export function InvestmentFxRateField({
  fromCurrency,
  toCurrency,
  value,
  onChange,
  hint,
  required,
}: {
  fromCurrency: string;
  toCurrency: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  required?: boolean;
}) {
  const { leading, trailing } = fxRateInputAddons(fromCurrency, toCurrency);
  return (
    <Field label="FX rate" hint={hint} required={required}>
      <InputGroup>
        <InputGroupAddon side="leading" aria-hidden>
          {leading}
        </InputGroupAddon>
        <InputGroupInput
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="FX rate"
          required={required}
        />
        <InputGroupAddon side="trailing" aria-hidden>
          {trailing}
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}
