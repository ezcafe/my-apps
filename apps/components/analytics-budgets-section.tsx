"use client";

import { useMemo } from "react";
import { formatMinor } from "@/lib/format-money";
import {
  moneyCategoryById,
  moneyCategoryLabel,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import type { AnalyticsLookupAccount, AnalyticsLookupTag } from "@/components/analytics-filters";

export type AnalyticsBudgetRow = {
  id: string;
  scopeType: "workspace" | "category" | "account" | "tag";
  scopeId: string | null;
  limitAmountMinor: number;
  currency: string;
  spentAmountMinor: number;
  effectiveLimitAmountMinor: number;
  progressPct: number;
  overBudget: boolean;
};

function clampPercent(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

function budgetLabel(
  budget: AnalyticsBudgetRow,
  categoryById: ReturnType<typeof moneyCategoryById>,
  accountById: Map<string, AnalyticsLookupAccount>,
  tagById: Map<string, AnalyticsLookupTag>,
): string {
  if (budget.scopeType === "workspace") return "Whole workspace";
  if (budget.scopeType === "category" && budget.scopeId) {
    const c = categoryById.get(budget.scopeId) ?? null;
    return c ? moneyCategoryLabel(c, categoryById) : "Category";
  }
  if (budget.scopeType === "account" && budget.scopeId) {
    return accountById.get(budget.scopeId)?.name ?? "Account";
  }
  if (budget.scopeType === "tag" && budget.scopeId) {
    return tagById.get(budget.scopeId)?.name ?? "Tag";
  }
  return budget.scopeType;
}

export function AnalyticsBudgetsSection({
  budgets,
  categories,
  accounts,
  tags,
  currency,
}: {
  budgets: AnalyticsBudgetRow[];
  categories: MoneyCategoryRow[];
  accounts: AnalyticsLookupAccount[];
  tags: AnalyticsLookupTag[];
  currency: string;
}) {
  const categoryById = moneyCategoryById(categories);
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  return (
    <section className="col-span-2 w-full min-w-0 rounded-md border border-border bg-surface p-4 md:col-span-6 lg:col-span-12">
      <h2 className="text-lg font-medium">Budgets</h2>
      <p className="mt-1 text-xs text-muted">
        Monthly budget usage for the selected date range (limits scale when the range spans multiple
        UTC months).
      </p>

      {budgets.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No budgets found for this workspace. Create budgets in Money settings.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {budgets.map((budget) => {
            const label = budgetLabel(budget, categoryById, accountById, tagById);
            const safePct = clampPercent(budget.progressPct);
            const limitMinor = budget.effectiveLimitAmountMinor ?? budget.limitAmountMinor;
            return (
              <li
                key={budget.id}
                className={`rounded-md p-3 ${
                  budget.overBudget
                    ? "border border-[color:var(--danger)]/40 bg-[color-mix(in_oklab,var(--danger)_8%,var(--background))]"
                    : "border border-border bg-background"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <div className="flex items-center gap-2">
                    {budget.overBudget ? (
                      <span className="rounded-full border border-[color:var(--danger)]/50 bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] px-2 py-0.5 text-xs font-medium text-[color:var(--danger)]">
                        Overspent
                      </span>
                    ) : null}
                    <span
                      className={`text-xs ${budget.overBudget ? "text-[color:var(--danger)]" : "text-muted"}`}
                    >
                      {budget.progressPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <p className={`mt-1 text-sm ${budget.overBudget ? "text-[color:var(--danger)]" : "text-muted"}`}>
                  {formatMinor(budget.spentAmountMinor, currency)} /{" "}
                  {formatMinor(limitMinor, currency)}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--foreground)_12%,transparent)]">
                  <div
                    className={`h-full rounded-full ${budget.overBudget ? "bg-[color:var(--danger)]" : "bg-foreground"}`}
                    style={{ width: `${safePct}%` }}
                    aria-hidden
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
