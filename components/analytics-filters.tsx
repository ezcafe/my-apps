"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { MultiSelect, type MultiSelectItem } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/select";
import { MoneyDateQuickPick } from "@/components/money-date-quick-pick";
import { MoneyUsageMultiQuickPick } from "@/components/money-usage-multi-quick-pick";
import { MoneyFilterToolbar } from "@/components/money-page-header";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { cn } from "@/lib/cn";
import {
  moneyCategoryById,
  moneyCategoryLabel,
  moneyCategoryGroupsByKind,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import type { UsageRankedItem } from "@/lib/money-usage-quick-pick";

export type {
  AnalyticsFiltersValue,
  AnalyticsKind,
  AnalyticsRecurrence,
} from "@/lib/analytics-default-filters";
export { defaultAnalyticsFilters } from "@/lib/analytics-default-filters";

import {
  defaultAnalyticsFilters,
  type AnalyticsFiltersValue,
  type AnalyticsKind,
  type AnalyticsRecurrence,
} from "@/lib/analytics-default-filters";

export type AnalyticsLookupAccount = {
  id: string;
  name: string;
  currency?: string;
  /** Present on chart/form lookups; used to pre-select ledger page defaults. */
  type?: string;
};
export type AnalyticsLookupMerchant = { id: string; name: string };
export type AnalyticsLookupTag = { id: string; name: string };
export type AnalyticsLookupRecurrence = { id: string; name: string };

export type AnalyticsWorkspaceRow = {
  id: string;
  name: string;
  kind: "personal" | "shared";
  ownedByUserSub: string | null;
  role: "owner" | "member";
  isDefault: boolean;
};

type DirectionKey = "all" | "expense" | "income" | "transfer";

const DIRECTION_OPTIONS: { value: DirectionKey; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Spending" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfers" },
];

const RECURRENCE_OPTIONS: { value: AnalyticsRecurrence; label: string }[] = [
  { value: "all", label: "All" },
  { value: "recurring", label: "Recurring" },
  { value: "one-time", label: "One-time" },
];

function deriveDirection(kinds: AnalyticsKind[]): DirectionKey {
  if (kinds.length !== 1) return "all";
  const k = kinds[0]!;
  return k;
}

function formatShortDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function workspaceOptionLabel(
  w: AnalyticsWorkspaceRow,
  userSub: string | undefined,
): string {
  const mine =
    w.kind === "personal" &&
    userSub != null &&
    w.ownedByUserSub === userSub;
  return (
    w.name +
    (mine ? " · Personal" : w.kind === "shared" ? " · Shared" : "")
  );
}

function ChevronDown({
  className,
  open,
}: {
  className?: string;
  open?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={cn(
        "size-4 shrink-0 transition-transform duration-200",
        open && "rotate-180",
        className,
      )}
    >
      <path
        fillRule="evenodd"
        d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FilterMenu({
  id,
  label,
  activeCount,
  isActive,
  openMenu,
  onOpenMenu,
  children,
  panelClassName,
}: {
  id: string;
  label: string;
  activeCount?: number;
  isActive?: boolean;
  openMenu: string | null;
  onOpenMenu: (id: string | null) => void;
  children: ReactNode;
  panelClassName?: string;
}) {
  const open = openMenu === id;
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setPanelPos({
      top: rect.bottom + 8,
      left: rect.left,
      minWidth: Math.max(rect.width, 16 * 16),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onOpenMenu(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onOpenMenu, open]);

  const panel =
    open && panelPos ? (
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-modal="false"
        style={{
          position: "fixed",
          top: panelPos.top,
          left: panelPos.left,
          minWidth: panelPos.minWidth,
        }}
        className={cn(
          "z-[100] max-w-[min(100vw-2rem,24rem)] rounded-[var(--radius-md)] border border-border bg-surface p-3 shadow-[var(--shadow-md)] fx-fade-in",
          panelClassName,
        )}
      >
        {children}
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenMenu(open ? null : id)}
        className={cn(
          "inline-flex max-w-[14rem] items-center gap-1 border-b-2 px-2.5 py-3 text-sm font-medium transition-colors duration-200 fx-press",
          open || isActive
            ? "border-foreground text-foreground"
            : "border-transparent text-muted hover:text-foreground",
        )}
      >
        <span className="truncate">{label}</span>
        {activeCount != null && activeCount > 0 ? (
          <span className="shrink-0 tabular-nums text-muted">({activeCount})</span>
        ) : null}
        <ChevronDown open={open} className="text-muted" />
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

function FilterCheckboxList({
  items,
  value,
  onChange,
  emptyHint = "Nothing to choose",
  searchable = true,
  searchPlaceholder = "Search…",
  "aria-label": ariaLabel,
}: {
  items: MultiSelectItem[];
  value: string[];
  onChange: (next: string[]) => void;
  emptyHint?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  "aria-label"?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  const toggle = (itemId: string) => {
    if (value.includes(itemId)) onChange(value.filter((v) => v !== itemId));
    else onChange([...value, itemId]);
  };

  return (
    <div role="listbox" aria-multiselectable="true" aria-label={ariaLabel}>
      {searchable && items.length > 6 ? (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="mb-2 w-full min-w-0 rounded-[var(--radius-sm)] border border-border bg-background px-2.5 py-1.5 text-sm text-foreground antialiased outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      ) : null}
      <div className="max-h-64 overflow-auto">
        {items.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted">{emptyHint}</p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted">No matches</p>
        ) : (
          filtered.map((item) => {
            const checked = value.includes(item.id);
            return (
              <div
                key={item.id}
                role="option"
                aria-selected={checked}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-foreground transition-colors duration-150 hover:bg-muted-surface",
                  checked && "bg-muted-surface",
                )}
              >
                <Checkbox
                  checked={checked}
                  onChange={() => toggle(item.id)}
                  ariaLabel={item.label}
                />
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="min-w-0 flex-1 truncate text-left fx-press"
                >
                  {item.label}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export type AnalyticsFilterViewOption = {
  id: string;
  label: string;
};

/** Immediate-apply view switch in the filter bar (ledger scope, Activity/Portfolio, …). */
export type AnalyticsFilterViewConfig = {
  /** Accessible / legend label (e.g. "Ledger", "View"). */
  menuLabel: string;
  value: string;
  options: readonly AnalyticsFilterViewOption[];
  onChange: (id: string) => void;
  /** Treat this value as inactive for the filter trigger underline. */
  defaultValue?: string;
};

function FilterViewRadios({
  menuLabel,
  value,
  options,
  onSelect,
}: {
  menuLabel: string;
  value: string;
  options: readonly AnalyticsFilterViewOption[];
  onSelect: (id: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className="grid gap-1.5 text-sm">
      <legend className="text-muted">{menuLabel}</legend>
      <div
        role="radiogroup"
        aria-label={menuLabel}
        className="flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1"
      >
        {options.map((opt) => {
          const selected = value === opt.id;
          return (
            <label
              key={opt.id}
              className={cn(
                "cursor-pointer rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors duration-200 fx-press",
                selected
                  ? "bg-muted-surface text-foreground"
                  : "text-muted hover:bg-muted-surface hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name={name}
                className="peer sr-only"
                checked={selected}
                onChange={() => onSelect(opt.id)}
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function viewFilterTriggerLabel(viewFilter: AnalyticsFilterViewConfig): string {
  return (
    viewFilter.options.find((o) => o.id === viewFilter.value)?.label ??
    viewFilter.menuLabel
  );
}

function viewFilterIsActive(viewFilter: AnalyticsFilterViewConfig): boolean {
  const fallback = viewFilter.options[0]?.id;
  const inactive = viewFilter.defaultValue ?? fallback;
  return inactive != null && viewFilter.value !== inactive;
}

function DirectionRadios({
  direction,
  onSelect,
}: {
  direction: DirectionKey;
  onSelect: (next: DirectionKey) => void;
}) {
  return (
    <fieldset className="grid gap-1.5 text-sm">
      <legend className="text-muted">Direction</legend>
      <div
        role="radiogroup"
        aria-label="Direction"
        className="flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1"
      >
        {DIRECTION_OPTIONS.map((opt) => {
          const selected = direction === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "cursor-pointer rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors duration-200 fx-press",
                selected
                  ? "bg-muted-surface text-foreground"
                  : "text-muted hover:bg-muted-surface hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name="analytics-direction"
                className="peer sr-only"
                checked={selected}
                onChange={() => onSelect(opt.value)}
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function RecurrenceRadios({
  recurrence,
  onSelect,
}: {
  recurrence: AnalyticsRecurrence;
  onSelect: (next: AnalyticsRecurrence) => void;
}) {
  return (
    <fieldset className="grid gap-1.5 text-sm">
      <legend className="text-muted">Recurrence</legend>
      <div
        role="radiogroup"
        aria-label="Recurrence"
        className="flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1"
      >
        {RECURRENCE_OPTIONS.map((opt) => {
          const selected = recurrence === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "cursor-pointer rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors duration-200 fx-press",
                selected
                  ? "bg-muted-surface text-foreground"
                  : "text-muted hover:bg-muted-surface hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name="analytics-recurrence"
                className="peer sr-only"
                checked={selected}
                onChange={() => onSelect(opt.value)}
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

type AnalyticsFiltersFieldsProps = {
  value: AnalyticsFiltersValue;
  onChange: (next: AnalyticsFiltersValue) => void;
  workspaces: AnalyticsWorkspaceRow[];
  activeWorkspaceId: string;
  onWorkspaceChange: (workspaceId: string) => void;
  switchingWorkspace: boolean;
  userSub: string | undefined;
  accountItems: MultiSelectItem[];
  categoryItems: MultiSelectItem[];
  merchantItems: MultiSelectItem[];
  tagItems: MultiSelectItem[];
  recurrenceItems: MultiSelectItem[];
  direction: DirectionKey;
  setDirection: (next: DirectionKey) => void;
  setRecurrence: (next: AnalyticsRecurrence) => void;
  viewFilter?: AnalyticsFilterViewConfig;
};

/** Date / merchants / tags / recurrence — secondary chrome under More. */
function secondaryFiltersActive(value: AnalyticsFiltersValue): boolean {
  const defaults = defaultAnalyticsFilters();
  return (
    value.fromDate !== defaults.fromDate ||
    value.toDate !== defaults.toDate ||
    value.merchantIds.length > 0 ||
    value.tagIds.length > 0 ||
    value.recurrence !== "all" ||
    value.recurrenceSourceIds.length > 0
  );
}

function AnalyticsFiltersPrimaryFields({
  value,
  onChange,
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
  switchingWorkspace,
  userSub,
  accountItems,
  categoryItems,
  direction,
  setDirection,
  viewFilter,
}: Omit<
  AnalyticsFiltersFieldsProps,
  "merchantItems" | "tagItems" | "recurrenceItems" | "setRecurrence"
>) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]">
      {viewFilter ? (
        <div className="col-span-full">
          <FilterViewRadios
            menuLabel={viewFilter.menuLabel}
            value={viewFilter.value}
            options={viewFilter.options}
            onSelect={viewFilter.onChange}
          />
        </div>
      ) : null}

      {workspaces.length > 1 ? (
        <Field label="Workspace">
          <Select
            value={activeWorkspaceId}
            disabled={workspaces.length === 0 || switchingWorkspace}
            onChange={(e) => {
              const next = e.target.value;
              if (!next || next === activeWorkspaceId) return;
              onWorkspaceChange(next);
            }}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {workspaceOptionLabel(w, userSub)}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <div className="col-span-full">
        <DirectionRadios direction={direction} onSelect={setDirection} />
      </div>

      <MoneyUsageMultiQuickPick
        legend="Accounts"
        ariaLabel="Filter by accounts"
        items={accountItems.map(
          (i): UsageRankedItem => ({
            id: i.id,
            label: i.label,
            usageCount: 0,
          }),
        )}
        value={value.accountIds}
        onChange={(next) => onChange({ ...value, accountIds: next })}
        otherLabel="Other accounts"
        emptyMessage="No accounts"
      />

      {direction === "transfer" ? null : (
        <MoneyUsageMultiQuickPick
          legend="Categories"
          ariaLabel="Filter by categories"
          items={categoryItems.map(
            (i): UsageRankedItem => ({
              id: i.id,
              label: i.label,
              usageCount: 0,
            }),
          )}
          value={value.categoryIds}
          onChange={(next) => onChange({ ...value, categoryIds: next })}
          otherLabel="Other categories"
          emptyMessage="No categories"
        />
      )}
    </div>
  );
}

function AnalyticsFiltersSecondaryFields({
  value,
  onChange,
  merchantItems,
  tagItems,
  recurrenceItems,
  direction,
  setRecurrence,
  compact = false,
}: Pick<
  AnalyticsFiltersFieldsProps,
  | "value"
  | "onChange"
  | "merchantItems"
  | "tagItems"
  | "recurrenceItems"
  | "direction"
  | "setRecurrence"
> & { compact?: boolean }) {
  return (
    <div
      className={cn(
        "grid gap-4",
        compact
          ? "gap-3"
          : "[grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]",
      )}
    >
      <MoneyDateQuickPick
        legend="From"
        ariaLabel="From date"
        value={value.fromDate}
        onChange={(fromDate) => onChange({ ...value, fromDate })}
      />

      <MoneyDateQuickPick
        legend="To"
        ariaLabel="To date"
        value={value.toDate}
        onChange={(toDate) => onChange({ ...value, toDate })}
      />

      <MoneyUsageMultiQuickPick
        legend="Merchants"
        ariaLabel="Filter by merchants"
        items={merchantItems.map(
          (i): UsageRankedItem => ({
            id: i.id,
            label: i.label,
            usageCount: 0,
          }),
        )}
        value={value.merchantIds}
        onChange={(next) => onChange({ ...value, merchantIds: next })}
        otherLabel="Other merchants"
        emptyMessage="No merchants"
      />

      <Field label="Tags" hint="Must have all selected">
        <FilterCheckboxList
          items={tagItems}
          value={value.tagIds}
          onChange={(next) => onChange({ ...value, tagIds: next })}
          emptyHint="No tags"
          aria-label="Filter by tags"
        />
      </Field>

      {direction === "transfer" ? null : (
        <>
          <div className="col-span-full">
            <RecurrenceRadios recurrence={value.recurrence} onSelect={setRecurrence} />
          </div>
          {value.recurrence !== "one-time" ? (
            <Field label="Recurrence templates">
              <MultiSelect
                items={recurrenceItems}
                value={value.recurrenceSourceIds}
                onChange={(next) =>
                  onChange({
                    ...value,
                    recurrenceSourceIds: next,
                    recurrence:
                      next.length > 0 && value.recurrence === "all"
                        ? "recurring"
                        : value.recurrence,
                  })
                }
                placeholder="All recurring"
                aria-label="Filter by recurrence templates"
                disablePortal={compact}
              />
            </Field>
          ) : null}
        </>
      )}
    </div>
  );
}

export function AnalyticsFiltersBar({
  viewFilter,
  value,
  onChange,
  onApply,
  onReset,
  applying,
  dirty,
  accounts,
  categories,
  merchants,
  tags,
  recurrenceTemplates,
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
  switchingWorkspace,
  userSub,
  onAdvancedFiltersNeeded,
}: {
  /** Immediate-apply view switch (ledger scope, Activity/Portfolio, …). */
  viewFilter?: AnalyticsFilterViewConfig;
  value: AnalyticsFiltersValue;
  onChange: (next: AnalyticsFiltersValue) => void;
  onApply: () => void;
  onReset: () => void;
  applying: boolean;
  dirty: boolean;
  accounts: AnalyticsLookupAccount[];
  categories: MoneyCategoryRow[];
  merchants: AnalyticsLookupMerchant[];
  tags: AnalyticsLookupTag[];
  recurrenceTemplates: AnalyticsLookupRecurrence[];
  workspaces: AnalyticsWorkspaceRow[];
  activeWorkspaceId: string;
  onWorkspaceChange: (workspaceId: string) => void;
  switchingWorkspace: boolean;
  userSub: string | undefined;
  /** Fires once when Date/Merchants/Tags/Recurrence (More) is opened. */
  onAdvancedFiltersNeeded?: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [morePanelMounted, setMorePanelMounted] = useState(false);
  const advancedFiltersSignaled = useRef(false);
  const categoryById = useMemo(() => moneyCategoryById(categories), [categories]);
  const categoryGroupsByKind = useMemo(
    () => moneyCategoryGroupsByKind(categories),
    [categories],
  );
  const direction = deriveDirection(value.kinds);

  useEffect(() => {
    if (advancedFiltersSignaled.current) return;
    if (!morePanelMounted && !mobileMoreOpen) return;
    advancedFiltersSignaled.current = true;
    onAdvancedFiltersNeeded?.();
  }, [mobileMoreOpen, morePanelMounted, onAdvancedFiltersNeeded]);

  const accountItems = useMemo<MultiSelectItem[]>(
    () => accounts.map((a) => ({ id: a.id, label: a.name })),
    [accounts],
  );

  const merchantItems = useMemo<MultiSelectItem[]>(
    () => merchants.map((m) => ({ id: m.id, label: m.name })),
    [merchants],
  );

  const tagItems = useMemo<MultiSelectItem[]>(
    () => tags.map((t) => ({ id: t.id, label: t.name })),
    [tags],
  );

  const recurrenceItems = useMemo<MultiSelectItem[]>(
    () => recurrenceTemplates.map((r) => ({ id: r.id, label: r.name })),
    [recurrenceTemplates],
  );

  const categoryItems = useMemo<MultiSelectItem[]>(() => {
    const result: MultiSelectItem[] = [];
    for (const kindGroup of categoryGroupsByKind) {
      if (direction === "expense" && kindGroup.kind !== "expense") continue;
      if (direction === "income" && kindGroup.kind !== "income") continue;
      const grouped: MultiSelectItem[] = [];
      const ungrouped: MultiSelectItem[] = [];
      for (const g of kindGroup.groups) {
        if (g.type === "single") {
          ungrouped.push({
            id: g.category.id,
            label: moneyCategoryLabel(g.category, categoryById),
          });
        } else {
          grouped.push({ id: g.parent.id, label: g.parent.name });
          for (const c of g.children) {
            grouped.push({ id: c.id, label: c.name });
          }
        }
      }
      result.push(...grouped, ...ungrouped);
    }
    return result;
  }, [categoryGroupsByKind, categoryById, direction]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const workspaceLabel = activeWorkspace
    ? workspaceOptionLabel(activeWorkspace, userSub)
    : "Workspace";

  const dateLabel = `${formatShortDate(value.fromDate)} – ${formatShortDate(value.toDate)}`;

  const directionLabel =
    direction === "all"
      ? "Direction"
      : (DIRECTION_OPTIONS.find((o) => o.value === direction)?.label ??
        "Direction");

  const secondaryActive = secondaryFiltersActive(value);
  const showMobileMore = mobileMoreOpen || secondaryActive;
  const showDesktopMorePanel = openMenu === "more" || morePanelMounted;

  const setDirection = (next: DirectionKey) => {
    if (next === "all") {
      onChange({ ...value, kinds: [] });
    } else if (next === "transfer") {
      onChange({
        ...value,
        kinds: [next],
        categoryIds: [],
        recurrence: "all",
        recurrenceSourceIds: [],
      });
    } else {
      const filteredCategories = value.categoryIds.filter((id) => {
        const cat = categoryById.get(id);
        if (!cat) return false;
        return cat.kind === next;
      });
      onChange({
        ...value,
        kinds: [next],
        categoryIds: filteredCategories,
      });
    }
  };

  const setRecurrence = (next: AnalyticsRecurrence) => {
    onChange({
      ...value,
      recurrence: next,
      recurrenceSourceIds: next === "one-time" ? [] : value.recurrenceSourceIds,
    });
  };

  const primaryFieldsProps = {
    value,
    onChange,
    workspaces,
    activeWorkspaceId,
    onWorkspaceChange,
    switchingWorkspace,
    userSub,
    accountItems,
    categoryItems,
    direction,
    setDirection,
    viewFilter,
  };

  const secondaryFieldsProps = {
    value,
    onChange,
    merchantItems,
    tagItems,
    recurrenceItems,
    direction,
    setRecurrence,
  };

  const onOpenMenu = (id: string | null) => {
    if (id === "more") setMorePanelMounted(true);
    setOpenMenu(id);
  };

  return (
    <section
      className={cn(MONEY_FULL_SPAN, "@container mb-4 fx-fade-in")}
      aria-label="Analytics filters"
    >
      <div className="flex justify-end @md:hidden">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => setMobileFiltersOpen(true)}
          trailing={
            dirty || secondaryActive ? (
              <span className="size-1.5 rounded-full bg-accent/70" aria-hidden />
            ) : null
          }
        >
          Filter
          {dirty ? (
            <span className="sr-only">Unapplied filter changes</span>
          ) : null}
        </Button>
      </div>

      {mobileFiltersOpen ? (
        <Modal
          open
          onClose={() => setMobileFiltersOpen(false)}
          bare
          labelledBy="analytics-filters-modal-heading"
        >
          <div className="fx-fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3
                  id="analytics-filters-modal-heading"
                  className="font-display text-lg font-medium tracking-tight"
                >
                  Filters
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Workspace switches immediately. Apply to refresh results.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
              >
                ✕
              </Button>
            </div>
            <div className="mt-4">
              <AnalyticsFiltersPrimaryFields {...primaryFieldsProps} />
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-sm font-medium text-foreground fx-press"
                aria-expanded={showMobileMore}
                onClick={() => setMobileMoreOpen((o) => !o)}
              >
                <span className="inline-flex items-center gap-2">
                  More filters
                  {secondaryActive ? (
                    <span
                      className="size-1.5 rounded-full bg-accent"
                      aria-hidden
                    />
                  ) : null}
                </span>
                <ChevronDown open={showMobileMore} className="text-muted" />
              </button>
              {showMobileMore ? (
                <div className="mt-3 fx-fade-in">
                  <p className="mb-3 text-xs text-muted">{dateLabel}</p>
                  <AnalyticsFiltersSecondaryFields {...secondaryFieldsProps} />
                </div>
              ) : null}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  onApply();
                  setMobileFiltersOpen(false);
                }}
                disabled={applying || !dirty}
              >
                {applying ? "Loading…" : "Apply filters"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onReset}
                disabled={applying}
              >
                Reset
              </Button>
              {dirty ? (
                <span className="text-xs text-muted fx-fade-in">
                  Unapplied changes — click Apply to refresh.
                </span>
              ) : null}
            </div>
          </div>
        </Modal>
      ) : null}

      <MoneyFilterToolbar className="mt-3 hidden @md:flex">
          {viewFilter ? (
            <FilterMenu
              id="view"
              label={viewFilterTriggerLabel(viewFilter)}
              isActive={viewFilterIsActive(viewFilter)}
              openMenu={openMenu}
              onOpenMenu={onOpenMenu}
            >
              <FilterViewRadios
                menuLabel={viewFilter.menuLabel}
                value={viewFilter.value}
                options={viewFilter.options}
                onSelect={(id) => {
                  viewFilter.onChange(id);
                  setOpenMenu(null);
                }}
              />
            </FilterMenu>
          ) : null}
          {workspaces.length > 1 ? (
            <FilterMenu
              id="workspace"
              label={workspaceLabel}
              openMenu={openMenu}
              onOpenMenu={onOpenMenu}
              panelClassName="min-w-[min(100vw-2rem,18rem)]"
            >
              <Field label="Workspace">
                <Select
                  value={activeWorkspaceId}
                  disabled={workspaces.length === 0 || switchingWorkspace}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (!next || next === activeWorkspaceId) return;
                    onWorkspaceChange(next);
                    setOpenMenu(null);
                  }}
                >
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {workspaceOptionLabel(w, userSub)}
                    </option>
                  ))}
                </Select>
              </Field>
              <p className="mt-2 text-xs text-muted">
                Workspace switches immediately.
              </p>
            </FilterMenu>
          ) : null}

          <FilterMenu
            id="direction"
            label={directionLabel}
            isActive={direction !== "all"}
            openMenu={openMenu}
            onOpenMenu={onOpenMenu}
          >
            <DirectionRadios direction={direction} onSelect={setDirection} />
          </FilterMenu>

          <FilterMenu
            id="accounts"
            label="Accounts"
            activeCount={value.accountIds.length}
            openMenu={openMenu}
            onOpenMenu={onOpenMenu}
            panelClassName="min-w-[min(100vw-2rem,22rem)]"
          >
            <MoneyUsageMultiQuickPick
              legend="Accounts"
              ariaLabel="Filter by accounts"
              items={accountItems.map(
                (i): UsageRankedItem => ({
                  id: i.id,
                  label: i.label,
                  usageCount: 0,
                }),
              )}
              value={value.accountIds}
              onChange={(next) => onChange({ ...value, accountIds: next })}
              otherLabel="Other accounts"
              emptyMessage="No accounts"
            />
          </FilterMenu>

          {direction === "transfer" ? null : (
            <FilterMenu
              id="categories"
              label="Categories"
              activeCount={value.categoryIds.length}
              openMenu={openMenu}
              onOpenMenu={onOpenMenu}
              panelClassName="min-w-[min(100vw-2rem,22rem)]"
            >
              <MoneyUsageMultiQuickPick
                legend="Categories"
                ariaLabel="Filter by categories"
                items={categoryItems.map(
                  (i): UsageRankedItem => ({
                    id: i.id,
                    label: i.label,
                    usageCount: 0,
                  }),
                )}
                value={value.categoryIds}
                onChange={(next) => onChange({ ...value, categoryIds: next })}
                otherLabel="Other categories"
                emptyMessage="No categories"
              />
            </FilterMenu>
          )}

          <FilterMenu
            id="more"
            label="More"
            isActive={secondaryActive}
            openMenu={openMenu}
            onOpenMenu={onOpenMenu}
            panelClassName="min-w-[min(100vw-2rem,22rem)]"
          >
            {showDesktopMorePanel ? (
              <div className="grid max-h-[min(70vh,32rem)] gap-3 overflow-y-auto">
                <p className="text-xs text-muted">Date · {dateLabel}</p>
                <AnalyticsFiltersSecondaryFields
                  {...secondaryFieldsProps}
                  compact
                />
              </div>
            ) : null}
          </FilterMenu>

          <div className="ms-2 flex shrink-0 items-center gap-2 border-s border-border ps-3">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                onApply();
                setOpenMenu(null);
              }}
              disabled={applying || !dirty}
            >
              {applying ? "Loading…" : "Apply"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onReset}
              disabled={applying}
            >
              Reset
            </Button>
          </div>
      </MoneyFilterToolbar>
    </section>
  );
}

/**
 * A single View filter menu (Activity / Portfolio, etc.) for pages
 * without the full analytics filter bar.
 */
export function MoneyViewFiltersBar({
  viewFilter,
}: {
  viewFilter: AnalyticsFilterViewConfig;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <section
      className={cn(MONEY_FULL_SPAN, "@container mb-4 fx-fade-in")}
      aria-label={`${viewFilter.menuLabel} filters`}
    >
      <MoneyFilterToolbar aria-label={viewFilter.menuLabel}>
        <FilterMenu
          id="view"
          label={viewFilterTriggerLabel(viewFilter)}
          isActive={viewFilterIsActive(viewFilter)}
          openMenu={openMenu}
          onOpenMenu={setOpenMenu}
        >
          <FilterViewRadios
            menuLabel={viewFilter.menuLabel}
            value={viewFilter.value}
            options={viewFilter.options}
            onSelect={(id) => {
              viewFilter.onChange(id);
              setOpenMenu(null);
            }}
          />
        </FilterMenu>
      </MoneyFilterToolbar>
    </section>
  );
}

/** @deprecated Use AnalyticsFiltersBar instead. */
export const AnalyticsFilters = AnalyticsFiltersBar;
