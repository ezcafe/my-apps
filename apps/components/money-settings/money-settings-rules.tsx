"use client";

import { presentClientError, toUserFacingMessage } from "@/lib/user-facing-error";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
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
  inputCls,
  MoneySettingsBackLink,
  primaryBtnCls,
  secondaryBtnCls,
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";

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
    <>
      <MoneySettingsBackLink current="Rules" />
      {bootstrapErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={bootstrapErr}
          className="mb-8"
        />
      ) : null}
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
    </>
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
      <form className="auto-fit-2 max-w-4xl" onSubmit={saveRule}>
        <input
          className={inputCls}
          placeholder="Rule name"
          value={ruleName}
          onChange={(e) => setRuleName(e.target.value)}
        />
        <input
          type="number"
          className={inputCls}
          placeholder="Priority"
          value={rulePriority}
          onChange={(e) => setRulePriority(Number(e.target.value))}
        />
        <select
          className={inputCls}
          value={ruleMerchantId}
          onChange={(e) => setRuleMerchantId(e.target.value)}
        >
          <option value="">Any merchant</option>
          {merchants.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          className={inputCls}
          value={ruleAccountId}
          onChange={(e) => setRuleAccountId(e.target.value)}
        >
          <option value="">Any account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          className={inputCls}
          value={ruleCategoryId}
          onChange={(e) => setRuleCategoryId(e.target.value)}
        >
          <option value="">Set category…</option>
          {visibleCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {moneyCategoryLabel(c, categoryById)}
            </option>
          ))}
        </select>
        <button type="submit" className={`${primaryBtnCls} self-start`}>
          Save rule
        </button>
      </form>
      <div className="mt-8 border-t border-border pt-8">
        <h3 className="text-sm font-medium text-foreground">Saved {meta.title.toLowerCase()}</h3>
        {visibleRules.length === 0 ? (
          <p className="mt-3 text-sm text-muted">None yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {visibleRules.map((r) => (
              <li
                key={r.id}
                className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 transition-colors duration-150 hover:border-foreground/30"
              >
                {editingId === r.id ? (
                  <form className="auto-fit-2 max-w-4xl" onSubmit={saveEdit}>
                    <input
                      className={inputCls}
                      placeholder="Rule name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <input
                      type="number"
                      className={inputCls}
                      placeholder="Priority"
                      value={editPriority}
                      onChange={(e) => setEditPriority(Number(e.target.value))}
                    />
                    <select
                      className={inputCls}
                      value={editMerchantId}
                      onChange={(e) => setEditMerchantId(e.target.value)}
                    >
                      <option value="">Any merchant</option>
                      {merchants.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={inputCls}
                      value={editAccountId}
                      onChange={(e) => setEditAccountId(e.target.value)}
                    >
                      <option value="">Any account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={inputCls}
                      value={editCategoryId}
                      onChange={(e) => setEditCategoryId(e.target.value)}
                    >
                      <option value="">Set category…</option>
                      {visibleCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {moneyCategoryLabel(c, categoryById)}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-muted">
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                      />
                      Active
                    </label>
                    <div className="col-span-full flex flex-wrap gap-2">
                      <button type="submit" className={primaryBtnCls}>
                        Save changes
                      </button>
                      <button type="button" className={secondaryBtnCls} onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {r.name} · priority {r.priority} · {r.active ? "active" : "off"}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`${secondaryBtnCls} shrink-0 px-2 py-1 text-xs`}
                        onClick={() => startEdit(r)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`${secondaryBtnCls} shrink-0 px-2 py-1 text-xs`}
                        onClick={() => void deleteRule(r.id, r.name)}
                      >
                        Delete
                      </button>
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
