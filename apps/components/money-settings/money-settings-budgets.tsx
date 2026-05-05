"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { formatMinor, parseMajorToMinor } from "@/lib/format-money";
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

type Category = MoneyCategoryRow;
type BudgetRow = {
  id: string;
  limitAmountMinor: number;
  periodStart: string;
  periodEnd: string;
  categoryId: string | null;
};

export function MoneySettingsBudgetsSection() {
  const notify = useNotify();
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);

  const [budLimit, setBudLimit] = useState("");
  const [budStart, setBudStart] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [budEnd, setBudEnd] = useState(() =>
    new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16),
  );
  const [budCategoryId, setBudCategoryId] = useState("");
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const categoryById = useMemo(() => moneyCategoryById(categories), [categories]);

  const loadCategories = useCallback(async () => {
    const { data } = await moneyApiJson<Category[]>("/api/money/categories");
    setCategories(data);
  }, []);
  const loadBudgets = useCallback(async () => {
    const { data } = await moneyApiJson<BudgetRow[]>("/api/money/budgets");
    setBudgets(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          await Promise.all([loadCategories(), loadBudgets()]);
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
  }, [loadCategories, loadBudgets]);

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault();
    try {
      const minor = parseMajorToMinor(budLimit);
      if (minor == null || minor <= 0) throw new Error("Invalid budget limit");
      const start = new Date(budStart);
      const end = new Date(budEnd);
      if (end <= start) throw new Error("End after start");

      await moneyApiJson("/api/money/budgets", {
        method: "POST",
        body: JSON.stringify({
          categoryId: budCategoryId || null,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          limitAmountMinor: minor,
          currency: "USD",
        }),
      });
      setBudLimit("");
      await loadBudgets();
      notify.success("Settings updated", "Budget saved.");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t save budget",
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
        id="money-settings-budgets-page"
        title="Budgets"
        description="Set spending caps for a period. Scope to one category or the whole workspace."
      >
        <form className="auto-fit-2 max-w-4xl" onSubmit={saveBudget}>
          <select
            className={inputCls}
            value={budCategoryId}
            onChange={(e) => setBudCategoryId(e.target.value)}
          >
            <option value="">Whole workspace</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {moneyCategoryLabel(c, categoryById)}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            className={inputCls}
            value={budStart}
            onChange={(e) => setBudStart(e.target.value)}
          />
          <input
            type="datetime-local"
            className={inputCls}
            value={budEnd}
            onChange={(e) => setBudEnd(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Limit amount"
            value={budLimit}
            onChange={(e) => setBudLimit(e.target.value)}
          />
          <button type="submit" className={`${primaryBtnCls} self-start`}>
            Save budget
          </button>
        </form>
        <div className="mt-8 border-t border-border pt-8">
          <h3 className="text-sm font-medium text-foreground">Active budgets</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {budgets.map((b) => (
              <li
                key={b.id}
                className="rounded-lg border border-border bg-background px-3 py-2"
              >
                {b.periodStart.slice(0, 10)} → {b.periodEnd.slice(0, 10)} ·{" "}
                {formatMinor(b.limitAmountMinor)}
              </li>
            ))}
          </ul>
        </div>
      </SettingsSection>
    </>
  );
}
