"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MultiSelect, type MultiSelectItem } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/select";
import {
  moneyCategoryById,
  moneyCategoryLabel,
  moneyCategoryGroupsByKind,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";

export type AnalyticsKind = "expense" | "income" | "transfer";

export type AnalyticsFiltersValue = {
  /** YYYY-MM-DD (HTML date input format), or "" when unset. */
  fromDate: string;
  toDate: string;
  accountIds: string[];
  categoryIds: string[];
  merchantIds: string[];
  tagIds: string[];
  kinds: AnalyticsKind[];
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar month: first day through last day of the current month. */
export function defaultAnalyticsFilters(): AnalyticsFiltersValue {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fromDate = `${y}-${pad2(m + 1)}-01`;
  const last = new Date(y, m + 1, 0);
  const toDate = `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-${pad2(last.getDate())}`;
  return {
    fromDate,
    toDate,
    accountIds: [],
    categoryIds: [],
    merchantIds: [],
    tagIds: [],
    kinds: [],
  };
}

export type AnalyticsLookupAccount = {
  id: string;
  name: string;
  currency?: string;
};
export type AnalyticsLookupMerchant = { id: string; name: string };
export type AnalyticsLookupTag = { id: string; name: string };

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

function deriveDirection(kinds: AnalyticsKind[]): DirectionKey {
  if (kinds.length !== 1) return "all";
  return kinds[0]!;
}

export function AnalyticsFilters({
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
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
  switchingWorkspace,
  userSub,
  onClose,
}: {
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
  workspaces: AnalyticsWorkspaceRow[];
  activeWorkspaceId: string;
  onWorkspaceChange: (workspaceId: string) => void;
  switchingWorkspace: boolean;
  userSub: string | undefined;
  onClose?: () => void;
}) {
  const categoryById = useMemo(() => moneyCategoryById(categories), [categories]);
  const categoryGroupsByKind = useMemo(
    () => moneyCategoryGroupsByKind(categories),
    [categories],
  );
  const direction = deriveDirection(value.kinds);

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

  const setDirection = (next: DirectionKey) => {
    if (next === "all") {
      onChange({ ...value, kinds: [] });
    } else {
      const filteredCategories =
        next === "transfer"
          ? []
          : value.categoryIds.filter((id) => {
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

  return (
    <section
      className="fx-fade-in"
      aria-label="Analytics filters"
      aria-labelledby="analytics-filters-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2
            id="analytics-filters-heading"
            className="font-display text-lg font-medium tracking-tight"
          >
            Filters
          </h2>
          <p className="mt-1 text-xs text-muted">
            Workspace switches immediately. Apply to refresh charts.
          </p>
        </div>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close filters"
          >
            ✕
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]">
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
            {workspaces.map((w) => {
              const mine =
                w.kind === "personal" &&
                userSub != null &&
                w.ownedByUserSub === userSub;
              const label =
                w.name +
                (mine
                  ? " · Personal"
                  : w.kind === "shared"
                    ? " · Shared"
                    : "");
              return (
                <option key={w.id} value={w.id}>
                  {label}
                </option>
              );
            })}
          </Select>
        </Field>

        <Field label="From">
          <Input
            type="date"
            value={value.fromDate}
            onChange={(e) => onChange({ ...value, fromDate: e.target.value })}
          />
        </Field>

        <Field label="To">
          <Input
            type="date"
            value={value.toDate}
            onChange={(e) => onChange({ ...value, toDate: e.target.value })}
          />
        </Field>

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
                  className={`cursor-pointer rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors duration-200 fx-press ${
                    selected
                      ? "bg-muted-surface text-foreground"
                      : "text-muted hover:bg-muted-surface hover:text-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="analytics-direction"
                    className="peer sr-only"
                    checked={selected}
                    onChange={() => setDirection(opt.value)}
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field label="Accounts">
          <MultiSelect
            items={accountItems}
            value={value.accountIds}
            onChange={(next) => onChange({ ...value, accountIds: next })}
            placeholder="All accounts"
            aria-label="Filter by accounts"
          />
        </Field>

        {direction === "transfer" ? null : (
          <Field label="Categories">
            <MultiSelect
              items={categoryItems}
              value={value.categoryIds}
              onChange={(next) => onChange({ ...value, categoryIds: next })}
              placeholder="All categories"
              aria-label="Filter by categories"
            />
          </Field>
        )}

        <Field label="Merchants">
          <MultiSelect
            items={merchantItems}
            value={value.merchantIds}
            onChange={(next) => onChange({ ...value, merchantIds: next })}
            placeholder="All merchants"
            aria-label="Filter by merchants"
          />
        </Field>

        <Field label="Tags" hint="Must have all selected">
          <MultiSelect
            items={tagItems}
            value={value.tagIds}
            onChange={(next) => onChange({ ...value, tagIds: next })}
            placeholder="No tag filter"
            aria-label="Filter by tags"
          />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onApply}
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
    </section>
  );
}
