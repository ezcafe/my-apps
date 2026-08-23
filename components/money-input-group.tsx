"use client";

import type { InputHTMLAttributes } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { getCurrencySymbol } from "@/lib/format-money";

type SharedProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: string;
  onChange: (value: string) => void;
};

export function MoneyInputGroup(
  props:
    | (SharedProps & { variant: "currency"; currency: string | null })
    | (SharedProps & { variant: "unit"; unit: string }),
) {
  if (props.variant === "currency") {
    return (
      <InputGroup className={props.className}>
        <InputGroupAddon side="leading" aria-hidden>
          {props.currency ? getCurrencySymbol(props.currency) : "—"}
        </InputGroupAddon>
        <InputGroupInput
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          inputMode={props.inputMode ?? "decimal"}
          disabled={props.disabled ? true : undefined}
          required={props.required}
          aria-label={props["aria-label"]}
          placeholder={props.placeholder}
          name={props.name}
          id={props.id}
          autoFocus={props.autoFocus}
        />
        <InputGroupAddon side="trailing" aria-hidden>
          {props.currency ?? "—"}
        </InputGroupAddon>
      </InputGroup>
    );
  }

  return (
    <InputGroup className={props.className}>
      <InputGroupInput
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        inputMode={props.inputMode ?? "decimal"}
        disabled={props.disabled ? true : undefined}
        required={props.required}
        aria-label={props["aria-label"]}
        placeholder={props.placeholder}
        name={props.name}
        id={props.id}
        autoFocus={props.autoFocus}
      />
      <InputGroupAddon side="trailing" aria-hidden>
        {props.unit}
      </InputGroupAddon>
    </InputGroup>
  );
}
