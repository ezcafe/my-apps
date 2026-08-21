"use client";

import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  MoneyUsageQuickPickOtherChipContent,
  moneyUsageQuickPickChipCls,
  moneyUsageQuickPickOtherChipCls,
} from "@/components/money-usage-quick-pick";
import { cn } from "@/lib/cn";
import { moneyQuickPickGroupCls } from "@/lib/money-quick-pick-chip-cls";
import {
  quickPickIds,
  topUsageItems,
  type UsageRankedItem,
} from "@/lib/money-usage-quick-pick";

const QUICK_PICK_N = 5;

const chipCls = moneyUsageQuickPickChipCls;
const otherChipCls = moneyUsageQuickPickOtherChipCls;

/**
 * Multi-select variant of MoneyUsageQuickPick: top usage chips toggle selection;
 * “Other” opens a searchable checklist for the rest.
 */
export function MoneyUsageMultiQuickPick({
  legend,
  ariaLabel,
  items,
  pickerItems: pickerItemsProp,
  value,
  onChange,
  otherLabel,
  emptyMessage = "No options yet.",
  className,
}: {
  legend: ReactNode;
  ariaLabel: string;
  items: readonly UsageRankedItem[];
  pickerItems?: readonly UsageRankedItem[];
  value: string[];
  onChange: (next: string[]) => void;
  otherLabel: string;
  emptyMessage?: string;
  className?: string;
}) {
  const listboxId = useId();
  const otherRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const quickItems = useMemo(
    () => topUsageItems(items, QUICK_PICK_N),
    [items],
  );
  const showOther = items.length > QUICK_PICK_N;
  const quickIds = useMemo(() => quickPickIds(quickItems), [quickItems]);
  const allPickerItems = pickerItemsProp ?? items;
  const selectedSet = useMemo(() => new Set(value), [value]);

  const otherSelectedIds = useMemo(
    () => value.filter((id) => !quickIds.has(id)),
    [value, quickIds],
  );
  const otherActive = showOther && otherSelectedIds.length > 0;

  const otherLabelText = useMemo(() => {
    if (!otherActive) return otherLabel;
    if (otherSelectedIds.length === 1) {
      return (
        allPickerItems.find((i) => i.id === otherSelectedIds[0])?.label ??
        otherLabel
      );
    }
    return `${otherSelectedIds.length} selected`;
  }, [otherActive, otherLabel, otherSelectedIds, allPickerItems]);

  const pickerItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [...allPickerItems];
    return allPickerItems.filter((i) => i.label.toLowerCase().includes(q));
  }, [allPickerItems, searchQuery]);

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

  const toggle = (id: string) => {
    if (selectedSet.has(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  if (items.length === 0) {
    return (
      <fieldset className={cn("grid min-w-0 gap-1.5 text-sm", className)}>
        <legend className="text-muted">{legend}</legend>
        <p className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-muted">
          {emptyMessage}
        </p>
      </fieldset>
    );
  }

  return (
    <fieldset className={cn("grid min-w-0 gap-1.5 text-sm", className)}>
      <legend className="text-muted">{legend}</legend>
      <div
        role="group"
        aria-label={ariaLabel}
        className={moneyQuickPickGroupCls}
      >
        {(showOther ? quickItems : items).map((item) => {
          const active = selectedSet.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(item.id)}
              className={chipCls(active)}
            >
              <span className="relative z-[1] block truncate">{item.label}</span>
            </button>
          );
        })}
        {showOther ? (
          <div ref={otherRef} className="relative inline-flex">
            <button
              type="button"
              aria-pressed={otherActive}
              onClick={() => setPickerOpen((o) => !o)}
              className={otherChipCls(otherActive)}
            >
              <MoneyUsageQuickPickOtherChipContent label={otherLabelText} />
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
                aria-multiselectable="true"
                aria-label={ariaLabel}
                className="max-h-64 overflow-auto rounded-[var(--radius-sm)]"
              >
                {pickerItems.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted">No matches</li>
                ) : (
                  pickerItems.map((item) => {
                    const checked = selectedSet.has(item.id);
                    return (
                      <li
                        key={item.id}
                        role="option"
                        aria-selected={checked}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-foreground transition-colors duration-150 hover:bg-muted-surface",
                          checked && "bg-muted-surface",
                          item.isChild && "pl-6",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onChange={() => toggle(item.id)}
                          ariaLabel={item.label}
                        />
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => toggle(item.id)}
                          className="min-w-0 flex-1 truncate text-left fx-press"
                        >
                          {item.label}
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
