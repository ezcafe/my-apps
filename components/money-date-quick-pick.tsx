"use client";

import { type ReactNode } from "react";
import {
  MoneyUsageQuickPickOtherChipContent,
  moneyUsageQuickPickChipCls,
  moneyUsageQuickPickOtherChipCls,
} from "@/components/money-usage-quick-pick";
import { cn } from "@/lib/cn";
import { moneyQuickPickGroupCls } from "@/lib/money-quick-pick-chip-cls";
import { useFormatDate } from "@/lib/format-date";

export type MoneyDateQuickPickMode = "today" | "yesterday" | "custom";

const WHEN_OPTIONS: ReadonlyArray<{ id: MoneyDateQuickPickMode; label: string }> = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "custom", label: "Select custom date" },
];

export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function yesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateString(d);
}

/** Split a `datetime-local` value into date (`YYYY-MM-DD`) and time (`HH:mm`…). */
export function splitDateTimeLocal(value: string): {
  date: string;
  time: string;
} {
  const trimmed = value.trim();
  if (!trimmed) return { date: "", time: "00:00" };
  const tIdx = trimmed.indexOf("T");
  if (tIdx < 0) return { date: trimmed.slice(0, 10), time: "00:00" };
  return {
    date: trimmed.slice(0, tIdx).slice(0, 10),
    time: trimmed.slice(tIdx + 1) || "00:00",
  };
}

/** Join date + time into a `datetime-local` string. */
export function joinDateTimeLocal(date: string, time = "00:00"): string {
  if (!date) return "";
  return `${date}T${time || "00:00"}`;
}

function deriveMode(value: string): MoneyDateQuickPickMode {
  if (!value) return "custom";
  if (value === localDateString()) return "today";
  if (value === yesterdayDateString()) return "yesterday";
  return "custom";
}

export function MoneyDateQuickPick({
  value,
  onChange,
  legend = "When",
  ariaLabel = "Date",
  required,
  className,
}: {
  /** Calendar date `YYYY-MM-DD`. */
  value: string;
  onChange: (date: string) => void;
  legend?: ReactNode;
  ariaLabel?: string;
  required?: boolean;
  className?: string;
}) {
  const { formatDate } = useFormatDate();
  const mode = deriveMode(value);
  const customDate = mode === "custom" ? value : "";

  const pickMode = (when: Exclude<MoneyDateQuickPickMode, "custom">) => {
    if (when === "today") {
      onChange(localDateString());
      return;
    }
    onChange(yesterdayDateString());
  };

  const handleCustomDateChange = (next: string) => {
    if (!next) return;
    onChange(next);
  };

  return (
    <fieldset className={cn("@container grid min-w-0 gap-1.5 text-sm", className)}>
      <legend className="text-muted">
        {required ? (
          <>
            <span className="text-foreground" aria-hidden>
              *
            </span>{" "}
            {legend}
          </>
        ) : (
          legend
        )}
      </legend>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className={cn(
          moneyQuickPickGroupCls,
          "w-max max-w-full @[22rem]:flex-nowrap",
        )}
      >
        {WHEN_OPTIONS.map((opt) => {
          const active = mode === opt.id;
          const isCustom = opt.id === "custom";
          const label =
            isCustom && customDate
              ? formatDate(customDate, { omitYearIfCurrent: true })
              : opt.label;
          if (isCustom) {
            return (
              <label
                key={opt.id}
                className={cn(
                  moneyUsageQuickPickOtherChipCls(active),
                  "shrink-0 min-w-0",
                )}
              >
                <span className="pointer-events-none">
                  <MoneyUsageQuickPickOtherChipContent label={label} />
                </span>
                <input
                  type="date"
                  value={customDate || value || ""}
                  onChange={(e) => handleCustomDateChange(e.target.value)}
                  aria-label={label}
                  className="native-date-overlay"
                />
              </label>
            );
          }
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (opt.id === "today" || opt.id === "yesterday") {
                  pickMode(opt.id);
                }
              }}
              className={cn(moneyUsageQuickPickChipCls(active), "shrink-0 min-w-0")}
            >
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
