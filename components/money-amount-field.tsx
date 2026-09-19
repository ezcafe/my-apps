"use client";

import type { ReactNode } from "react";
import { Field } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/cn";

export type MoneyAmountFieldProps = {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  leadingAddon?: ReactNode;
  trailingAddon?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  autoFocus?: boolean;
  inputMode?: "decimal" | "numeric" | "text";
  "aria-label"?: string;
  /** Recent-amount chips or other content below the input. */
  recentSlot?: ReactNode;
  className?: string;
  inputClassName?: string;
  "data-testid"?: string;
};

/** Shared Amount row (money/new + Growth Value/Amount). */
export function MoneyAmountField({
  label,
  value,
  onChange,
  leadingAddon,
  trailingAddon,
  required,
  hint,
  error,
  placeholder,
  autoFocus,
  inputMode = "decimal",
  "aria-label": ariaLabel,
  recentSlot,
  className,
  inputClassName,
  "data-testid": testId,
}: MoneyAmountFieldProps) {
  return (
    <Field
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={cn(className)}
    >
      <div data-testid="money-amount-field">
        <InputGroup>
          {leadingAddon != null && leadingAddon !== "" ? (
            <InputGroupAddon side="leading" aria-hidden>
              {leadingAddon}
            </InputGroupAddon>
          ) : null}
          <InputGroupInput
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode={inputMode}
            placeholder={placeholder}
            autoFocus={autoFocus}
            required={required}
            aria-label={
              ariaLabel ?? (typeof label === "string" ? label : undefined)
            }
            className={inputClassName}
            data-testid={testId}
          />
          {trailingAddon != null && trailingAddon !== "" ? (
            <InputGroupAddon side="trailing" aria-hidden>
              {trailingAddon}
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </div>
      {recentSlot}
    </Field>
  );
}
