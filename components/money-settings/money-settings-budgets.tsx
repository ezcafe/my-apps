"use client";

import { presentClientError, toUserFacingMessage } from "@/lib/user-facing-error";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MoneyUsageQuickPick } from "@/components/money-usage-quick-pick";
import { useNotify } from "@/components/notification-provider";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  formatMinor,
  minorToMajorInput,
  parseMajorToMinor,
} from "@/lib/format-money";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_BUDGET_CREATE_MUTATION,
  MONEY_BUDGET_DELETE_MUTATION,
  MONEY_BUDGET_UPDATE_MUTATION,
  MONEY_BUDGETS_FOR_RANGE_QUERY,
  MONEY_LIST_ACCOUNTS_QUERY,
  MONEY_LIST_CATEGORIES_QUERY,
  MONEY_LIST_TAGS_QUERY,
} from "@/lib/money-gql-documents";
import {
  moneyCategoryById,
  moneyCategoryLabel,
  moneyCategorySelectGroups,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import { utcCalendarMonthRangeIso } from "@/lib/budget-utc-month-range";
import { moneyBudgetScopeTypeSchema } from "@/lib/validators/money";
import type { z } from "zod";
import {
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

type BudgetScope = z.infer<typeof moneyBudgetScopeTypeSchema>;

type Category = MoneyCategoryRow & { archived?: boolean };

const KIND_TAG: Record<MoneyCategoryRow["kind"], string> = {
  expense: "Spending",
  income: "Income",
};

function categoryOptionLabel(
  c: MoneyCategoryRow,
  byId: ReturnType<typeof moneyCategoryById>,
): string {
  return `${moneyCategoryLabel(c, byId)} (${KIND_TAG[c.kind]})`;
}
type AccountRow = { id: string; name: string; archived?: boolean };
type TagRow = { id: string; name: string };

type BudgetRow = {
  id: string;
  limitAmountMinor: number;
  currency: string;
  scopeType: BudgetScope;
  scopeId: string | null;
  createdAt: string;
  spentAmountMinor?: number;
  effectiveLimitAmountMinor?: number;
  progressPct?: number;
  overBudget?: boolean;
};

const SCOPE_OPTIONS: { value: BudgetScope; label: string }[] = [
  { value: "workspace", label: "Whole workspace" },
  { value: "category", label: "Category" },
  { value: "account", label: "Account" },
  { value: "tag", label: "Tag" },
];

function budgetRowLabel(
  b: BudgetRow,
  categoryById: ReturnType<typeof moneyCategoryById>,
  accountById: Map<string, AccountRow>,
  tagById: Map<string, TagRow>,
): string {
  if (b.scopeType === "workspace") return "Whole workspace";
  if (b.scopeType === "category" && b.scopeId) {
    const c = categoryById.get(b.scopeId) ?? null;
    return c ? categoryOptionLabel(c, categoryById) : "Category";
  }
  if (b.scopeType === "account" && b.scopeId) {
    return accountById.get(b.scopeId)?.name ?? "Account";
  }
  if (b.scopeType === "tag" && b.scopeId) {
    return tagById.get(b.scopeId)?.name ?? "Tag";
  }
  return b.scopeType;
}

export function MoneySettingsBudgetsSection() {
  const notify = useNotify();
  const { defaultCurrency } = useWorkspaceCurrency();
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);

  const [budScopeType, setBudScopeType] = useState<BudgetScope>("workspace");
  const [budScopeId, setBudScopeId] = useState("");
  const [budLimit, setBudLimit] = useState("");
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScopeType, setEditScopeType] = useState<BudgetScope>("workspace");
  const [editScopeId, setEditScopeId] = useState("");
  const [editLimit, setEditLimit] = useState("");

  const visibleCategories = useMemo(
    () => categories.filter((c) => !c.archived),
    [categories],
  );
  const visibleAccounts = useMemo(
    () => accounts.filter((a) => !a.archived),
    [accounts],
  );

  const categoryById = useMemo(
    () => moneyCategoryById(visibleCategories),
    [visibleCategories],
  );
  const accountById = useMemo(
    () => new Map(visibleAccounts.map((a) => [a.id, a])),
    [visibleAccounts],
  );
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const budgetCategorySelectGroups = useMemo(() => {
    const groups = moneyCategorySelectGroups(visibleCategories);
    const singleRoots = groups.filter((g) => g.type === "single");
    const parentGroups = groups.filter((g) => g.type === "group");
    return { singleRoots, parentGroups };
  }, [visibleCategories]);

  const budgetCategoryQuickItems = useMemo(() => {
    const items: {
      id: string;
      label: string;
      usageCount: number;
      isChild?: boolean;
    }[] = [];
    for (const g of budgetCategorySelectGroups.singleRoots) {
      items.push({
        id: g.category.id,
        label: categoryOptionLabel(g.category, categoryById),
        usageCount: 0,
      });
    }
    for (const g of budgetCategorySelectGroups.parentGroups) {
      items.push({
        id: g.parent.id,
        label: `${moneyCategoryLabel(g.parent, categoryById)} (all) (${KIND_TAG[g.parent.kind]})`,
        usageCount: 0,
      });
      for (const child of g.children) {
        items.push({
          id: child.id,
          label: categoryOptionLabel(child, categoryById),
          usageCount: 0,
          isChild: true,
        });
      }
    }
    return items;
  }, [budgetCategorySelectGroups, categoryById]);

  const budgetAccountQuickItems = useMemo(
    () =>
      visibleAccounts.map((a) => ({
        id: a.id,
        label: a.name,
        usageCount: 0,
      })),
    [visibleAccounts],
  );

  const loadCategories = useCallback(async () => {
    const res = await moneyGraphQLRequest<{ moneyCategories: Category[] }>(
      MONEY_LIST_CATEGORIES_QUERY,
    );
    setCategories(res.moneyCategories);
  }, []);
  const loadAccounts = useCallback(async () => {
    const res = await moneyGraphQLRequest<{ moneyAccounts: AccountRow[] }>(
      MONEY_LIST_ACCOUNTS_QUERY,
    );
    setAccounts(res.moneyAccounts);
  }, []);
  const loadTags = useCallback(async () => {
    const res = await moneyGraphQLRequest<{ moneyTags: TagRow[] }>(MONEY_LIST_TAGS_QUERY);
    setTags(res.moneyTags);
  }, []);
  const loadBudgets = useCallback(async () => {
    const { from, to } = utcCalendarMonthRangeIso();
    const res = await moneyGraphQLRequest<{ moneyBudgets: BudgetRow[] }>(
      MONEY_BUDGETS_FOR_RANGE_QUERY,
      {
        includeSpent: true,
        from,
        to,
      },
    );
    setBudgets(res.moneyBudgets);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          await Promise.all([loadCategories(), loadAccounts(), loadTags(), loadBudgets()]);
        } catch (e: unknown) {
          if (!cancelled) {
            setBootstrapErr(presentClientError("money-settings-budgets", e));
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [loadCategories, loadAccounts, loadTags, loadBudgets]);

  function startEdit(b: BudgetRow) {
    setEditingId(b.id);
    setEditScopeType(b.scopeType);
    setEditScopeId(b.scopeId ?? "");
    setEditLimit(minorToMajorInput(b.limitAmountMinor, defaultCurrency));
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    try {
      const minor = parseMajorToMinor(editLimit, defaultCurrency);
      if (minor == null || minor <= 0) throw new Error("Invalid budget limit");
      if (editScopeType !== "workspace" && !editScopeId) {
        throw new Error("Choose a category, account, or tag");
      }
      await moneyGraphQLRequest(MONEY_BUDGET_UPDATE_MUTATION, {
        id: editingId,
        input: {
          scopeType: editScopeType,
          scopeId: editScopeType === "workspace" ? null : editScopeId,
          limitAmountMinor: minor,
        },
      });
      cancelEdit();
      await loadBudgets();
      notify.success("Settings updated", "Budget saved.");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t save budget",
        toUserFacingMessage(e, "Something went wrong"),
      );
    }
  }

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault();
    try {
      const minor = parseMajorToMinor(budLimit, defaultCurrency);
      if (minor == null || minor <= 0) throw new Error("Invalid budget limit");
      if (budScopeType !== "workspace" && !budScopeId) {
        throw new Error("Choose a category, account, or tag");
      }

      await moneyGraphQLRequest(MONEY_BUDGET_CREATE_MUTATION, {
        input: {
          scopeType: budScopeType,
          scopeId: budScopeType === "workspace" ? null : budScopeId,
          limitAmountMinor: minor,
        },
      });
      setBudLimit("");
      setBudScopeType("workspace");
      setBudScopeId("");
      await loadBudgets();
      notify.success("Settings updated", "Budget saved.");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t save budget",
        toUserFacingMessage(e, "Something went wrong"),
      );
    }
  }

  async function deleteBudget(id: string) {
    if (!window.confirm("Delete this budget? This cannot be undone.")) return;
    try {
      await moneyGraphQLRequest(MONEY_BUDGET_DELETE_MUTATION, { id });
      if (editingId === id) cancelEdit();
      await loadBudgets();
      notify.success("Budget removed", "The budget was deleted.");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t delete budget",
        toUserFacingMessage(e, "Something went wrong"),
      );
    }
  }

  function scopeSelect(
    scopeType: BudgetScope,
    scopeId: string,
    onScopeType: (v: BudgetScope) => void,
    onScopeId: (v: string) => void,
    idPrefix: string,
  ) {
    return (
      <>
        <Field label="Scope">
          <Select
            id={`${idPrefix}-scope-type`}
            value={scopeType}
            onChange={(e) => {
              onScopeType(e.target.value as BudgetScope);
              onScopeId("");
            }}
          >
            {SCOPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        {scopeType === "category" ? (
          <MoneyUsageQuickPick
            legend="Category"
            ariaLabel="Category"
            required
            items={budgetCategoryQuickItems}
            selectedId={scopeId}
            onSelect={onScopeId}
            otherLabel="Select other category"
            emptyMessage="No categories yet."
          />
        ) : null}
        {scopeType === "account" ? (
          <MoneyUsageQuickPick
            legend="Account"
            ariaLabel="Account"
            required
            items={budgetAccountQuickItems}
            selectedId={scopeId}
            onSelect={onScopeId}
            otherLabel="Select other account"
            emptyMessage="No accounts yet."
          />
        ) : null}
        {scopeType === "tag" ? (
          <Field label="Tag" required>
            <Select
              id={`${idPrefix}-scope-tag`}
              value={scopeId}
              onChange={(e) => onScopeId(e.target.value)}
              required
            >
              <option value="">Select tag</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </>
    );
  }

  return (
    <div className={MONEY_FULL_SPAN}>
      {bootstrapErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={bootstrapErr}
          className="mb-8"
        />
      ) : null}
      <SettingsSection
        id="money-settings-budgets-page"
        title="Budgets"
        description="Set a monthly spending cap. One budget per workspace, category, account, or tag. Caps repeat every calendar month."
      >
        <form className="flex max-w-xl flex-col gap-3" onSubmit={saveBudget}>
          {scopeSelect(budScopeType, budScopeId, setBudScopeType, setBudScopeId, "new")}
          <Field label="Monthly limit">
            <Input
              placeholder="Monthly limit amount"
              value={budLimit}
              onChange={(e) => setBudLimit(e.target.value)}
            />
          </Field>
          <Button type="submit" variant="primary" className="self-start">
            Save budget
          </Button>
        </form>
        <div className="mt-8 border-t border-border pt-8">
          <h3 className="text-sm font-medium text-foreground">Active budgets</h3>
          <ul className="mt-3 divide-y divide-border rounded-[var(--radius-sm)] bg-background text-sm text-muted">
            {budgets.map((b) => {
              const overBudget = b.overBudget === true;
              const spentMinor = b.spentAmountMinor ?? 0;
              return (
                <li
                  key={b.id}
                  className={`px-3 py-2.5 ${
                    overBudget
                      ? "bg-[color-mix(in_oklab,var(--danger)_8%,var(--background))]"
                      : ""
                  }`}
                >
                  {editingId === b.id ? (
                    <form className="flex flex-col gap-3" onSubmit={saveEdit}>
                      {scopeSelect(
                        editScopeType,
                        editScopeId,
                        setEditScopeType,
                        setEditScopeId,
                        `edit-${b.id}`,
                      )}
                      <Field label="Monthly limit">
                        <Input
                          placeholder="Monthly limit amount"
                          value={editLimit}
                          onChange={(e) => setEditLimit(e.target.value)}
                        />
                      </Field>
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" variant="primary" size="sm">
                          Save
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={overBudget ? "text-[color:var(--danger)]" : ""}>
                        {budgetRowLabel(b, categoryById, accountById, tagById)} ·{" "}
                        {formatMinor(b.limitAmountMinor, defaultCurrency)} / month
                        {` · ${formatMinor(spentMinor, defaultCurrency)} spent`}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {overBudget ? (
                          <span className="rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] px-2 py-0.5 text-sm font-medium text-[color:var(--danger)]">
                            Overspent
                          </span>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(b)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => void deleteBudget(b.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </SettingsSection>
    </div>
  );
}
