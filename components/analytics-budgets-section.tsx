"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { formatMinor } from "@/lib/format-money";
import { cn } from "@/lib/cn";
import { moneyCategoryById, type MoneyCategoryRow } from "@/lib/money-category-ui";
import { analyticsBudgetLabel } from "@/lib/analytics-budget-label";
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
    <Card className="col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12">
      <h2 className="font-display text-lg font-medium">Budgets</h2>
      <p className="mt-1 text-sm text-muted">
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
            const label = analyticsBudgetLabel(
              budget,
              categoryById,
              accountById,
              tagById,
            );
            const safePct = clampPercent(budget.progressPct);
            const limitMinor = budget.effectiveLimitAmountMinor ?? budget.limitAmountMinor;
            return (
              <li
                key={budget.id}
                className={cn(
                  "rounded-[var(--radius-md)] border p-3 transition-colors duration-200 fx-fade-in",
                  budget.overBudget
                    ? "border-[color:var(--destructive)]/40 bg-[color-mix(in_oklab,var(--destructive)_8%,var(--background))]"
                    : "border-border bg-background hover:border-foreground/30",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <div className="flex items-center gap-2">
                    {budget.overBudget ? (
                      <span className="rounded-[var(--radius-sm)] border border-[color:var(--destructive)]/50 bg-[color-mix(in_oklab,var(--destructive)_14%,transparent)] px-2 py-0.5 text-sm font-medium text-[color:var(--destructive)]">
                        Overspent
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "text-sm",
                        budget.overBudget ? "text-destructive" : "text-muted",
                      )}
                    >
                      {budget.progressPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <p
                  className={cn(
                    "mt-1 text-sm",
                    budget.overBudget ? "text-destructive" : "text-muted",
                  )}
                >
                  {formatMinor(budget.spentAmountMinor, currency)} /{" "}
                  {formatMinor(limitMinor, currency)}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--foreground)_12%,transparent)]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      budget.overBudget ? "bg-destructive" : "bg-accent",
                    )}
                    style={{ width: `${safePct}%` }}
                    aria-hidden
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
