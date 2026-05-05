"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { moneyApiJson } from "@/lib/money-fetch";
import {
  moneyCategoryById,
  moneyCategoryLabel,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import {
  inputCls,
  MoneySettingsBackLink,
  primaryBtnCls,
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";

type Account = { id: string; name: string };
type Merchant = { id: string; name: string };
type Category = MoneyCategoryRow;
type RuleRow = { id: string; name: string; priority: number; active: boolean };

export function MoneySettingsRulesSection() {
  const notify = useNotify();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);

  const [ruleName, setRuleName] = useState("");
  const [rulePriority, setRulePriority] = useState(0);
  const [ruleMerchantId, setRuleMerchantId] = useState("");
  const [ruleAccountId, setRuleAccountId] = useState("");
  const [ruleCategoryId, setRuleCategoryId] = useState("");
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const categoryById = useMemo(() => moneyCategoryById(categories), [categories]);

  const loadAccounts = useCallback(async () => {
    const { data } = await moneyApiJson<Account[]>("/api/money/accounts");
    setAccounts(data);
  }, []);
  const loadCategories = useCallback(async () => {
    const { data } = await moneyApiJson<Category[]>("/api/money/categories");
    setCategories(data);
  }, []);
  const loadMerchants = useCallback(async () => {
    const { data } = await moneyApiJson<Merchant[]>("/api/money/merchants");
    setMerchants(data);
  }, []);
  const loadRules = useCallback(async () => {
    const { data } = await moneyApiJson<RuleRow[]>("/api/money/rules");
    setRules(data);
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
            setBootstrapErr(e instanceof Error ? e.message : "Error");
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [loadAccounts, loadCategories, loadMerchants, loadRules]);

  async function saveRule(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!ruleName.trim()) throw new Error("Rule name required");
      if (!ruleCategoryId) throw new Error("Pick category for rule action");
      const match: Record<string, string> = {};
      if (ruleMerchantId) match.merchantId = ruleMerchantId;
      if (ruleAccountId) match.accountId = ruleAccountId;
      const action = { setCategoryId: ruleCategoryId };
      if (Object.keys(match).length === 0) {
        throw new Error("Pick an account and/or merchant to match");
      }

      await moneyApiJson("/api/money/rules", {
        method: "POST",
        body: JSON.stringify({
          name: ruleName,
          priority: rulePriority,
          match,
          action,
          active: true,
        }),
      });
      setRuleName("");
      setRuleMerchantId("");
      setRuleAccountId("");
      setRuleCategoryId("");
      await loadRules();
      notify.success("Settings updated", "Rule saved.");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t save rule",
        e instanceof Error ? e.message : "Something went wrong",
      );
    }
  }

  return (
    <>
      <MoneySettingsBackLink />
      {bootstrapErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={bootstrapErr}
          className="mb-8"
        />
      ) : null}
      <SettingsSection
        id="money-settings-rules-page"
        title="Rules"
        description="Transactions matching the selected merchant and/or account get the category you choose below."
      >
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
            {categories.map((c) => (
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
          <h3 className="text-sm font-medium text-foreground">Saved rules</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {rules.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
              >
                <span>
                  {r.name} · priority {r.priority} · {r.active ? "active" : "off"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </SettingsSection>
    </>
  );
}
