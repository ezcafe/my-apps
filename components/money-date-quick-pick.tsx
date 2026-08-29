"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  MoneyUsageQuickPickOtherChipContent,
  moneyUsageQuickPickChipCls,
  moneyUsageQuickPickOtherChipCls,
} from "@/components/money-usage-quick-pick";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { moneyQuickPickGroupCls } from "@/lib/money-quick-pick-chip-cls";
import { useFormatDate } from "@/lib/format-date";
import {
  addCalendarMonths,
  CALENDAR_WEEKDAY_LABELS,
  calendarMonthCells,
  parseLocalDateString,
} from "@/lib/money-date-calendar";

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

function monthTitle(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const parsed = parseLocalDateString(value) ?? new Date();
  const [view, setView] = useState(() => ({
    year: parsed.getFullYear(),
    monthIndex: parsed.getMonth(),
  }));

  const cells = useMemo(
    () => calendarMonthCells(view.year, view.monthIndex),
    [view.year, view.monthIndex],
  );

  const customLabel = customDate
    ? formatDate(customDate, { omitYearIfCurrent: true })
    : "Select custom date";

  const pickMode = (when: Exclude<MoneyDateQuickPickMode, "custom">) => {
    setCalendarOpen(false);
    if (when === "today") {
      onChange(localDateString());
      return;
    }
    onChange(yesterdayDateString());
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
        className={moneyQuickPickGroupCls}
      >
        {WHEN_OPTIONS.map((opt) => {
          const active = mode === opt.id;
          if (opt.id === "custom") {
            return (
              <Popover
                key={opt.id}
                align="start"
                aria-label={customLabel}
                open={calendarOpen}
                onOpenChange={(next) => {
                  setCalendarOpen(next);
                  if (next) {
                    const d = parseLocalDateString(value) ?? new Date();
                    setView({
                      year: d.getFullYear(),
                      monthIndex: d.getMonth(),
                    });
                  }
                }}
                containerClassName="basis-full @md:basis-auto w-full @md:w-auto"
                triggerClassName={cn(
                  moneyUsageQuickPickOtherChipCls(active),
                  "w-full @md:w-auto",
                )}
                trigger={
                  <MoneyUsageQuickPickOtherChipContent label={customLabel} />
                }
                className="w-[min(100vw-2rem,20rem)] p-3"
              >
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] text-foreground transition-[background-color] duration-150 hover:bg-muted-surface focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring fx-press"
                      aria-label="Previous month"
                      onClick={() =>
                        setView((v) => addCalendarMonths(v.year, v.monthIndex, -1))
                      }
                    >
                      ‹
                    </button>
                    <p className="min-w-0 text-center text-sm font-medium">
                      {monthTitle(view.year, view.monthIndex)}
                    </p>
                    <button
                      type="button"
                      className="inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] text-foreground transition-[background-color] duration-150 hover:bg-muted-surface focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring fx-press"
                      aria-label="Next month"
                      onClick={() =>
                        setView((v) => addCalendarMonths(v.year, v.monthIndex, 1))
                      }
                    >
                      ›
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-sm text-muted">
                    {CALENDAR_WEEKDAY_LABELS.map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((cell) => {
                      const selected = cell.date === value;
                      return (
                        <button
                          key={cell.date}
                          type="button"
                          onClick={() => {
                            onChange(cell.date);
                            setCalendarOpen(false);
                          }}
                          className={cn(
                            "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] text-sm tabular-nums transition-[background-color,color] duration-150 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring fx-press",
                            cell.inMonth ? "text-foreground" : "text-muted",
                            selected
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-muted-surface",
                          )}
                        >
                          {Number(cell.date.slice(8, 10))}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Popover>
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
              className={moneyUsageQuickPickChipCls(active)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
