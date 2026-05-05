"use client";

import { useMemo } from "react";
import {
  moneyCategoryById,
  moneyCategoryLabel,
  moneyCategorySelectGroups,
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

const KIND_OPTIONS: { value: AnalyticsKind; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

function readMultiSelect(e: React.ChangeEvent<HTMLSelectElement>): string[] {
  return Array.from(e.target.selectedOptions, (o) => o.value);
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
  const categoryGroups = useMemo(
    () => moneyCategorySelectGroups(categories),
    [categories],
  );

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-sm font-sans font-normal leading-normal tracking-normal text-foreground antialiased w-full min-w-0";
  const dateInputCls = `${inputCls} [&::-webkit-datetime-edit]:font-sans [&::-webkit-datetime-edit-fields-wrapper]:font-sans`;
  const multiSelectCls = `${inputCls} min-h-[8.5rem]`;

  const kindToggle = (k: AnalyticsKind) => {
    const has = value.kinds.includes(k);
    const next = has
      ? value.kinds.filter((x) => x !== k)
      : [...value.kinds, k];
    onChange({ ...value, kinds: next });
  };

  return (
    <section
      className="rounded-md border border-border bg-surface p-4"
      aria-label="Analytics filters"
      aria-labelledby="analytics-filters-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 id="analytics-filters-heading" className="text-lg font-medium">
            Filters
          </h2>
          <p className="mt-1 text-xs text-muted">
            Workspace switches immediately. Apply to refresh charts.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            className="shrink-0 rounded-md border border-border px-2.5 py-1 text-sm text-muted hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] hover:text-foreground"
            aria-label="Close filters"
            onClick={onClose}
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]">
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Workspace</span>
          <select
            className={inputCls}
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
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-muted">From</span>
          <input
            type="date"
            className={dateInputCls}
            value={value.fromDate}
            onChange={(e) =>
              onChange({ ...value, fromDate: e.target.value })
            }
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-muted">To</span>
          <input
            type="date"
            className={dateInputCls}
            value={value.toDate}
            onChange={(e) => onChange({ ...value, toDate: e.target.value })}
          />
        </label>

        <fieldset className="grid gap-1 text-sm">
          <legend className="text-muted">Kind</legend>
          <div className="flex flex-wrap gap-3 rounded-md border border-border bg-background px-3 py-2">
            {KIND_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={value.kinds.includes(opt.value)}
                  onChange={() => kindToggle(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-1 text-sm">
          <span className="text-muted">
            Accounts{" "}
            <span className="text-xs text-muted">
              (Ctrl/Cmd-click to multi-select)
            </span>
          </span>
          <select
            multiple
            size={5}
            className={multiSelectCls}
            value={value.accountIds}
            onChange={(e) =>
              onChange({ ...value, accountIds: readMultiSelect(e) })
            }
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-muted">Categories</span>
          <select
            multiple
            size={5}
            className={multiSelectCls}
            value={value.categoryIds}
            onChange={(e) =>
              onChange({ ...value, categoryIds: readMultiSelect(e) })
            }
          >
            {categoryGroups.map((g) =>
              g.type === "single" ? (
                <option key={g.category.id} value={g.category.id}>
                  {moneyCategoryLabel(g.category, categoryById)}
                </option>
              ) : (
                <optgroup key={g.parent.id} label={g.parent.name}>
                  <option value={g.parent.id}>{g.parent.name}</option>
                  {g.children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ),
            )}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-muted">Merchants</span>
          <select
            multiple
            size={5}
            className={multiSelectCls}
            value={value.merchantIds}
            onChange={(e) =>
              onChange({ ...value, merchantIds: readMultiSelect(e) })
            }
          >
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-muted">
            Tags{" "}
            <span className="text-xs text-muted">
              (must have all selected)
            </span>
          </span>
          <select
            multiple
            size={5}
            className={multiSelectCls}
            value={value.tagIds}
            onChange={(e) =>
              onChange({ ...value, tagIds: readMultiSelect(e) })
            }
          >
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onApply}
          disabled={applying || !dirty}
          className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {applying ? "Loading…" : "Apply filters"}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={applying}
          className="rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset
        </button>
        {dirty ? (
          <span className="text-xs text-muted">
            Unapplied changes — click Apply to refresh.
          </span>
        ) : null}
      </div>
    </section>
  );
}
