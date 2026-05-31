"use client";

import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import {
  budgetUtilizationChipFill,
  type BudgetUtilizationChipFill,
} from "@/lib/budget-utilization-chart-colors";
import {
  isOtherSelection,
  otherChipLabel,
  quickPickIds,
  topUsageItems,
  type UsageRankedItem,
} from "@/lib/money-usage-quick-pick";

const QUICK_PICK_N = 5;

const chipCls = (active: boolean) =>
  cn(
    "relative isolate min-w-20 max-w-full overflow-hidden rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press",
    active ? "bg-surface shadow-[var(--shadow-sm)]" : "hover:bg-muted-surface",
    active ? "text-foreground" : "text-muted hover:text-foreground",
  );

export function BudgetUtilizationFillLayer({ fill }: { fill: BudgetUtilizationChipFill }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 start-0 rounded-[inherit]"
      style={{
        width: `${fill.widthPct}%`,
        backgroundColor: `color-mix(in oklab, ${fill.fillColor} 42%, transparent)`,
      }}
    />
  );
}

export function budgetFillTitle(fill: BudgetUtilizationChipFill): string {
  const pct =
    fill.progressPct >= 100
      ? fill.progressPct.toFixed(0)
      : fill.progressPct.toFixed(1);
  return `${pct}% of budget used`;
}

export function MoneyUsageQuickPick({
  legend,
  ariaLabel,
  required,
  items,
  pickerItems: pickerItemsProp,
  selectedId,
  onSelect,
  otherLabel,
  allowEmpty = false,
  emptyCountsAsOther = false,
  emptySelectedOnOther = false,
  emptyMessage = "No options yet.",
  renderPickerRow,
  chipBudgetProgressPct,
  className,
}: {
  legend: ReactNode;
  ariaLabel: string;
  required?: boolean;
  /** Items used for top-5 quick chips (non-empty ids only). */
  items: readonly UsageRankedItem[];
  /** Full picker list; defaults to `items` plus optional empty row. */
  pickerItems?: readonly UsageRankedItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  otherLabel: string;
  allowEmpty?: boolean;
  /** When ≤5 items, include a “No category” (etc.) quick chip from picker items. */
  emptyCountsAsOther?: boolean;
  /** When true with `selectedId === ""`, Other chip shows the empty option label. */
  emptySelectedOnOther?: boolean;
  emptyMessage?: string;
  /** Optional extra content per picker row (e.g. account balance). */
  renderPickerRow?: (item: UsageRankedItem) => ReactNode;
  /** Budget utilization % per item id (fills chip from the left). */
  chipBudgetProgressPct?: (id: string) => number | undefined;
  className?: string;
}) {
  const listboxId = useId();
  const otherRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const showOtherOnly = items.length === 0 && allowEmpty;

  const quickItems = useMemo(
    () => topUsageItems(items, QUICK_PICK_N),
    [items],
  );
  const showOther = items.length > QUICK_PICK_N || showOtherOnly;
  const chipItems = useMemo(() => {
    if (showOther) return quickItems;
    if (!emptyCountsAsOther) return quickItems;
    const none = (pickerItemsProp ?? items).find((i) => i.id === "");
    if (!none || quickItems.some((i) => i.id === "")) return quickItems;
    return [...quickItems, none];
  }, [showOther, emptyCountsAsOther, quickItems, pickerItemsProp, items]);
  const quickIds = useMemo(() => quickPickIds(quickItems), [quickItems]);
  const allPickerItems = pickerItemsProp ?? items;

  const labelLookupItems = useMemo(() => {
    const byId = new Map<string, UsageRankedItem>();
    for (const item of [...items, ...allPickerItems]) {
      byId.set(item.id, item);
    }
    return [...byId.values()];
  }, [items, allPickerItems]);

  const otherActive =
    showOther &&
    isOtherSelection(
      selectedId,
      quickIds,
      items.length,
      QUICK_PICK_N,
      emptySelectedOnOther,
    );
  const otherLabelText = otherChipLabel(
    selectedId,
    labelLookupItems,
    quickIds,
    items.length,
    otherLabel,
    QUICK_PICK_N,
    emptySelectedOnOther,
  );

  const pickerItems = useMemo(() => {
    const base = allowEmpty
      ? [{ id: "", label: "—", usageCount: 0 }, ...allPickerItems]
      : [...allPickerItems];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((i) => i.label.toLowerCase().includes(q));
  }, [allPickerItems, allowEmpty, searchQuery]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = otherRef.current;
      if (!el?.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const closePicker = () => {
    setPickerOpen(false);
    setSearchQuery("");
  };

  const pick = (id: string) => {
    onSelect(id);
    closePicker();
  };

  if (items.length === 0 && !allowEmpty) {
    return (
      <fieldset className={cn("grid min-w-0 gap-1.5 text-sm", className)}>
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
        <p className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-muted">
          {emptyMessage}
        </p>
      </fieldset>
    );
  }

  return (
    <fieldset className={cn("grid min-w-0 gap-1.5 text-sm", className)}>
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
        className="inline-flex min-w-0 flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1"
      >
        {chipItems.map((item) => {
          const active = selectedId === item.id && !otherActive;
          const fill = item.id
            ? budgetUtilizationChipFill(chipBudgetProgressPct?.(item.id))
            : null;
          return (
            <button
              key={item.id || "__none"}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(item.id)}
              className={chipCls(active)}
              title={fill ? budgetFillTitle(fill) : undefined}
            >
              {fill ? <BudgetUtilizationFillLayer fill={fill} /> : null}
              <span className="relative z-[1] block truncate">{item.label}</span>
            </button>
          );
        })}
        {showOther ? (
          <div ref={otherRef} className="relative inline-flex">
            <button
              type="button"
              role="radio"
              aria-checked={otherActive}
              onClick={() => setPickerOpen((o) => !o)}
              className={chipCls(otherActive)}
            >
              {otherLabelText}
            </button>
            <div
              id={listboxId}
              role="dialog"
              aria-modal="false"
              aria-label={otherLabel}
              data-open={pickerOpen}
              inert={!pickerOpen}
              className={cn(
                "pointer-events-none absolute start-0 top-[calc(100%+0.5rem)] z-50 min-w-[min(100vw-2rem,18rem)] max-w-[min(100vw-2rem,22rem)] -translate-y-1 rounded-[var(--radius-md)] border border-border bg-surface p-2 opacity-0 shadow-[var(--shadow-md)] transition-[opacity,transform] duration-200 ease-out data-[open=true]:pointer-events-auto data-[open=true]:translate-y-0 data-[open=true]:opacity-100 motion-reduce:transition-none",
              )}
            >
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="mb-2"
                aria-label={`Search ${ariaLabel}`}
                autoFocus={pickerOpen}
              />
              <ul
                role="listbox"
                aria-label={ariaLabel}
                className="max-h-64 overflow-auto rounded-[var(--radius-sm)]"
              >
                {pickerItems.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted">No matches</li>
                ) : (
                  pickerItems.map((item) => {
                    const fill = item.id
                      ? budgetUtilizationChipFill(
                          chipBudgetProgressPct?.(item.id),
                        )
                      : null;
                    const selected = selectedId === item.id;
                    return (
                    <li
                      key={item.id === "" ? "__none" : item.id}
                      role="option"
                      aria-selected={selected}
                    >
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pick(item.id)}
                        className={cn(
                          "relative isolate flex w-full items-center justify-between gap-2 overflow-hidden rounded-[var(--radius-sm)] py-2 pr-3 text-left text-sm transition-[background-color,color] duration-150",
                          item.isChild ? "pl-8" : "pl-3",
                          selected ? "bg-accent" : "hover:bg-muted-surface",
                          selected ? "text-accent-foreground" : "text-foreground",
                        )}
                        title={fill ? budgetFillTitle(fill) : undefined}
                      >
                        {fill ? <BudgetUtilizationFillLayer fill={fill} /> : null}
                        <span className="relative z-[1] min-w-0 truncate">
                          {item.label}
                        </span>
                        {renderPickerRow ? (
                          <span className="shrink-0 text-xs text-muted">
                            {renderPickerRow(item)}
                          </span>
                        ) : null}
                      </button>
                    </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}
