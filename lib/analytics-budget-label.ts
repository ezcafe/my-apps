import type { AnalyticsBudgetRow } from "@/components/analytics-budgets-section";
import type {
  AnalyticsLookupAccount,
  AnalyticsLookupTag,
} from "@/components/analytics-filters";
import {
  moneyCategoryById,
  moneyCategoryLabel,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";

export function analyticsBudgetLabel(
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

export function budgetRowsForChart(
  budgets: AnalyticsBudgetRow[],
  categories: MoneyCategoryRow[],
  accounts: AnalyticsLookupAccount[],
  tags: AnalyticsLookupTag[],
) {
  const categoryById = moneyCategoryById(categories);
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const tagById = new Map(tags.map((t) => [t.id, t]));
  return budgets.map((budget) => ({
    key: budget.id,
    label: analyticsBudgetLabel(budget, categoryById, accountById, tagById),
    valueMinor: budget.spentAmountMinor,
    limitMinor: budget.effectiveLimitAmountMinor ?? budget.limitAmountMinor,
    overLimit: budget.overBudget,
  }));
}
