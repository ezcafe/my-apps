"use client";

import type { ReactNode } from "react";
import { presentClientError, toUserFacingMessage } from "@/lib/user-facing-error";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MoneyUsageQuickPick } from "@/components/money-usage-quick-pick";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_LIST_ACCOUNTS_QUERY,
  MONEY_LIST_CATEGORIES_QUERY,
  MONEY_LIST_MERCHANTS_QUERY,
  MONEY_LIST_RULES_QUERY,
  MONEY_RULE_CREATE_MUTATION,
  MONEY_RULE_DELETE_MUTATION,
  MONEY_RULE_UPDATE_MUTATION,
} from "@/lib/money-gql-documents";
import {
  categoriesOfKind,
  moneyCategoryById,
  moneyCategoryLabel,
  type MoneyCategoryKind,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import {
  SettingsSection,
} from "@/components/settings/settings-section";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";
import { MoneyStatusEmphasis } from "@/lib/money-status-strip";

type Account = { id: string; name: string; archived?: boolean };
type Merchant = { id: string; name: string };
type Category = MoneyCategoryRow & { archived?: boolean };

type RuleMatch = {
  merchantId?: string;
  accountId?: string;
};

type RuleAction = {
  setCategoryId?: string;
  tagIds?: string[];
};

type RuleRow = {
  id: string;
  name: string;
  kind: MoneyCategoryKind;
  priority: number;
  active: boolean;
  match: RuleMatch;
  action: RuleAction;
};

const KIND_META: Record<
  MoneyCategoryKind,
  { id: string; title: string; description: string }
> = {
  expense: {
    id: "money-settings-rules-spending",
    title: "Spending rules",
    description:
      "Match expense transactions by merchant and/or account, then assign a spending category.",
  },
  income: {
    id: "money-settings-rules-income",
    title: "Income rules",
    description:
      "Match income transactions by merchant and/or account, then assign an income category.",
  },
};

function ruleRowSummary(
  r: RuleRow,
  merchants: Merchant[],
  accounts: Account[],
  categoryById: ReturnType<typeof moneyCategoryById>,
): ReactNode {
  const merchantLabel = r.match.merchantId
    ? merchants.find((m) => m.id === r.match.merchantId)?.name ?? "merchant"
    : null;
  const accountLabel = r.match.accountId
    ? accounts.find((a) => a.id === r.match.accountId)?.name ?? "account"
    : null;
  const categoryId = r.action.setCategoryId;
  const category =
    categoryId != null ? categoryById.get(categoryId) ?? null : null;
  const categoryLabel = category
    ? moneyCategoryLabel(category, categoryById)
    : "category";

  const matchParts: string[] = [];
  if (merchantLabel) matchParts.push(`merchant is ${merchantLabel}`);
  if (accountLabel) matchParts.push(`account is ${accountLabel}`);
  const matchText =
    matchParts.length > 0 ? matchParts.join(" and ") : "any transaction";

  return (
    <>
      If {matchText} → category{" "}
      <MoneyStatusEmphasis>{categoryLabel}</MoneyStatusEmphasis>
      {!r.active ? (
        <span className="text-muted"> · off</span>
      ) : r.priority > 0 ? (
        <span className="text-muted"> · priority {r.priority}</span>
      ) : null}
    </>
  );
}

export function MoneySettingsRulesSection() {
  const notify = useNotify();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    const res = await moneyGraphQLRequest<{ moneyAccounts: Account[] }>(
      MONEY_LIST_ACCOUNTS_QUERY,
    );
    setAccounts(res.moneyAccounts);
  }, []);
  const loadCategories = useCallback(async () => {
    const res = await moneyGraphQLRequest<{ moneyCategories: Category[] }>(
      MONEY_LIST_CATEGORIES_QUERY,
    );
    setCategories(res.moneyCategories);
  }, []);
  const loadMerchants = useCallback(async () => {
    const res = await moneyGraphQLRequest<{ moneyMerchants: Merchant[] }>(
      MONEY_LIST_MERCHANTS_QUERY,
    );
    setMerchants(res.moneyMerchants);
  }, []);
  const loadRules = useCallback(async () => {
    const res = await moneyGraphQLRequest<{ moneyRules: RuleRow[] }>(
      MONEY_LIST_RULES_QUERY,
    );
    setRules(res.moneyRules);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          await Promise.all([
            loadAccounts(),
            loadCategories(),
            loadMerchants(),
            loadRules(),
          ]);
        } catch (e: unknown) {
          if (!cancelled) {
            setBootstrapErr(presentClientError("money-settings-rules", e));
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [loadAccounts, loadCategories, loadMerchants, loadRules]);

  const visibleAccounts = useMemo(
    () => accounts.filter((a) => !a.archived),
    [accounts],
  );

  return (
    <div className={SHELL_FULL_SPAN}>
      {bootstrapErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={bootstrapErr}
          className="mb-8"
        />
      ) : null}
      <div className="space-y-4">
        <RulesKindSection
          kind="expense"
          rules={rules}
          merchants={merchants}
          accounts={visibleAccounts}
          categories={categories}
          notify={notify}
          reloadRules={loadRules}
        />
        <RulesKindSection
          kind="income"
          rules={rules}
          merchants={merchants}
          accounts={visibleAccounts}
          categories={categories}
          notify={notify}
          reloadRules={loadRules}
        />
      </div>
    </div>
  );
}

type NotifyApi = ReturnType<typeof useNotify>;

function RulesKindSection({
  kind,
  rules,
  merchants,
  accounts,
  categories,
  notify,
  reloadRules,
}: {
  kind: MoneyCategoryKind;
  rules: RuleRow[];
  merchants: Merchant[];
  accounts: Account[];
  categories: Category[];
  notify: NotifyApi;
  reloadRules: () => Promise<void>;
}) {
  const meta = KIND_META[kind];

  const visibleCategories = useMemo(
    () => categoriesOfKind(categories, kind).filter((c) => !c.archived),
    [categories, kind],
  );
  const categoryById = useMemo(
    () => moneyCategoryById(visibleCategories),
    [visibleCategories],
  );
  const merchantQuickItems = useMemo(
    () => [
      { id: "", label: "Any merchant", usageCount: 1_000_000 },
      ...merchants.map((m) => ({ id: m.id, label: m.name, usageCount: 0 })),
    ],
    [merchants],
  );
  const accountQuickItems = useMemo(
    () => [
      { id: "", label: "Any account", usageCount: 1_000_000 },
      ...accounts.map((a) => ({ id: a.id, label: a.name, usageCount: 0 })),
    ],
    [accounts],
  );
  const categoryQuickItems = useMemo(
    () =>
      visibleCategories.map((c) => ({
        id: c.id,
        label: moneyCategoryLabel(c, categoryById),
        usageCount: 0,
      })),
    [visibleCategories, categoryById],
  );
  const visibleRules = useMemo(
    () => rules.filter((r) => r.kind === kind),
    [rules, kind],
  );

  const [ruleName, setRuleName] = useState("");
  const [rulePriority, setRulePriority] = useState(0);
  const [ruleMerchantId, setRuleMerchantId] = useState("");
  const [ruleAccountId, setRuleAccountId] = useState("");
  const [ruleCategoryId, setRuleCategoryId] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPriority, setEditPriority] = useState(0);
  const [editMerchantId, setEditMerchantId] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editTagIds, setEditTagIds] = useState<string[]>([]);

  function startEdit(r: RuleRow) {
    setEditingId(r.id);
    setEditName(r.name);
    setEditPriority(r.priority);
    setEditMerchantId(r.match.merchantId ?? "");
    setEditAccountId(r.match.accountId ?? "");
    setEditCategoryId(r.action.setCategoryId ?? "");
    setEditActive(r.active);
    setEditTagIds(r.action.tagIds ?? []);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    try {
      if (!editName.trim()) throw new Error("Rule name required");
      if (!editCategoryId) throw new Error("Pick category for rule action");
      const match: RuleMatch = {};
      if (editMerchantId) match.merchantId = editMerchantId;
      if (editAccountId) match.accountId = editAccountId;
      if (!match.merchantId && !match.accountId) {
        throw new Error("Pick an account and/or merchant to match");
      }
      const action: RuleAction = { setCategoryId: editCategoryId };
      if (editTagIds.length > 0) action.tagIds = editTagIds;

      await moneyGraphQLRequest(MONEY_RULE_UPDATE_MUTATION, {
        id: editingId,
        input: {
          name: editName.trim(),
          priority: editPriority,
          match,
          action,
          active: editActive,
        },
      });
      cancelEdit();
      await reloadRules();
      notify.success("Settings updated", "Rule saved.");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t save rule",
        toUserFacingMessage(e, "Something went wrong"),
      );
    }
  }

  async function deleteRule(id: string, name: string) {
    if (!window.confirm(`Delete rule “${name}”? This cannot be undone.`)) {
      return;
    }
    try {
      await moneyGraphQLRequest(MONEY_RULE_DELETE_MUTATION, { id });
      if (editingId === id) cancelEdit();
      await reloadRules();
      notify.success("Settings updated", "Rule deleted.");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t delete rule",
        toUserFacingMessage(e, "Something went wrong"),
      );
    }
  }

  async function saveRule(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!ruleName.trim()) throw new Error("Rule name required");
      if (!ruleCategoryId) throw new Error("Pick category for rule action");
      const match: RuleMatch = {};
      if (ruleMerchantId) match.merchantId = ruleMerchantId;
      if (ruleAccountId) match.accountId = ruleAccountId;
      const action: RuleAction = { setCategoryId: ruleCategoryId };
      if (!match.merchantId && !match.accountId) {
        throw new Error("Pick an account and/or merchant to match");
      }

      await moneyGraphQLRequest(MONEY_RULE_CREATE_MUTATION, {
        input: {
          name: ruleName,
          kind,
          priority: rulePriority,
          match,
          action,
          active: true,
        },
      });
      setRuleName("");
      setRuleMerchantId("");
      setRuleAccountId("");
      setRuleCategoryId("");
      await reloadRules();
      notify.success("Settings updated", "Rule saved.");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t save rule",
        toUserFacingMessage(e, "Something went wrong"),
      );
    }
  }

  return (
    <SettingsSection id={meta.id} title={meta.title} description={meta.description}>
      <form className="flex max-w-xl flex-col gap-3" onSubmit={saveRule}>
        <Field label="Name">
          <Input
            placeholder="Rule name"
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
          />
        </Field>
        <h4 className="text-sm font-medium text-foreground">
          When a transaction matches…
        </h4>
        <MoneyUsageQuickPick
          legend="Merchant"
          ariaLabel="Merchant"
          items={merchantQuickItems}
          selectedId={ruleMerchantId}
          onSelect={setRuleMerchantId}
          otherLabel="Select other merchant"
          emptyMessage="No merchants yet."
        />
        <MoneyUsageQuickPick
          legend="Account"
          ariaLabel="Account"
          items={accountQuickItems}
          selectedId={ruleAccountId}
          onSelect={setRuleAccountId}
          otherLabel="Select other account"
          emptyMessage="No accounts yet."
        />
        <h4 className="text-sm font-medium text-foreground">Then set…</h4>
        <MoneyUsageQuickPick
          legend="Category"
          ariaLabel="Category"
          required
          items={categoryQuickItems}
          selectedId={ruleCategoryId}
          onSelect={setRuleCategoryId}
          otherLabel="Select other category"
          emptyMessage="No categories yet."
        />
        <Field label="Priority" hint="Higher numbers run first when several rules match.">
          <Input
            type="number"
            placeholder="0"
            value={rulePriority}
            onChange={(e) => setRulePriority(Number(e.target.value))}
          />
        </Field>
        <Button type="submit" variant="primary" className="self-start">
          Save rule
        </Button>
      </form>
      <div className="mt-8 border-t border-border pt-8">
        <h3 className="text-sm font-medium text-foreground">Saved {meta.title.toLowerCase()}</h3>
        {visibleRules.length === 0 ? (
          <p className="mt-3 text-sm text-muted">None yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-[var(--radius-sm)] bg-background text-sm text-muted">
            {visibleRules.map((r) => (
              <li key={r.id} className="px-3 py-2.5">
                {editingId === r.id ? (
                  <form className="flex flex-col gap-3" onSubmit={saveEdit}>
                    <Field label="Name">
                      <Input
                        placeholder="Rule name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </Field>
                    <Field label="Priority">
                      <Input
                        type="number"
                        placeholder="Priority"
                        value={editPriority}
                        onChange={(e) => setEditPriority(Number(e.target.value))}
                      />
                    </Field>
                    <MoneyUsageQuickPick
                      legend="Merchant"
                      ariaLabel="Merchant"
                      items={merchantQuickItems}
                      selectedId={editMerchantId}
                      onSelect={setEditMerchantId}
                      otherLabel="Select other merchant"
                      emptyMessage="No merchants yet."
                    />
                    <MoneyUsageQuickPick
                      legend="Account"
                      ariaLabel="Account"
                      items={accountQuickItems}
                      selectedId={editAccountId}
                      onSelect={setEditAccountId}
                      otherLabel="Select other account"
                      emptyMessage="No accounts yet."
                    />
                    <MoneyUsageQuickPick
                      legend="Category"
                      ariaLabel="Category"
                      required
                      items={categoryQuickItems}
                      selectedId={editCategoryId}
                      onSelect={setEditCategoryId}
                      otherLabel="Select other category"
                      emptyMessage="No categories yet."
                    />
                    <label className="flex items-center gap-2 text-sm text-muted">
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                      />
                      Active
                    </label>
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
                    <span className="text-foreground">
                      {ruleRowSummary(r, merchants, accounts, categoryById)}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(r)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => void deleteRule(r.id, r.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </SettingsSection>
  );
}
