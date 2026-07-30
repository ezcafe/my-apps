import type { AnalyticsFiltersValue } from "@/components/analytics-filters";
import { buildQuery } from "@/lib/analytics-build-query";
import {
  MONEY_SEED_BILLS,
  MONEY_SEED_NECESSITIES,
} from "@/lib/money-seed-defaults";
import type { MoneyCategoryRow } from "@/lib/money-category-ui";

export type MoneyLedgerScopeId =
  | "all"
  | "spending"
  | "bills"
  | "savings"
  | "loans"
  | "investments";

export type MoneyLedgerScopeOption = {
  id: MoneyLedgerScopeId;
  label: string;
  preset?: MoneyLedgerPreset;
  accentIndex: number;
};

export type MoneyLedgerEmptyStateIcon =
  | "wallet"
  | "bills"
  | "savings"
  | "loan"
  | "investment"
  | "table";

export type MoneyLedgerEmptyState = {
  title: string;
  description: string;
  icon: MoneyLedgerEmptyStateIcon;
  accentChartIndex: number;
  primaryAction?: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
};

export type MoneyLedgerPreset = {
  title: string;
  description: string;
  emptyState: MoneyLedgerEmptyState;
  chart: {
    title: string;
    description: string;
    compareHint?: string;
  };
  /** Always merged into the transactions query (user filters cannot override). */
  lockedQuery: Partial<{
    kinds: AnalyticsFiltersValue["kinds"];
    accountTypes: string[];
    excludeAccountTypes: string[];
    categoryIds: string[];
  }>;
  /** Resolved at runtime from workspace categories (see findSeedBillsCategoryId). */
  lockedCategorySeed?: {
    parentName: typeof MONEY_SEED_NECESSITIES;
    name: typeof MONEY_SEED_BILLS;
  };
};

export const MONEY_LEDGER_SPENDING: MoneyLedgerPreset = {
  title: "Spending",
  description:
    "Everyday expenses, income, and transfers on checking, cash, and credit accounts. Default range is the current calendar month — apply to refresh.",
  emptyState: {
    title: "Nothing in this range",
    description:
      "Try widening the date range, or add a transaction to track spending and income.",
    icon: "wallet",
    accentChartIndex: 0,
    primaryAction: { href: "/money", label: "Add transaction" },
  },
  lockedQuery: {
    kinds: ["expense", "income", "transfer"],
    excludeAccountTypes: ["savings", "investment", "loan"],
  },
  chart: {
    title: "Net cumulative flow",
    description:
      "Cumulative income minus expenses for everyday accounts in the selected range.",
    compareHint: "Solid: this month through today. Dashed: prior month.",
  },
};

export const MONEY_LEDGER_BILLS: MoneyLedgerPreset = {
  title: "Bills",
  description:
    "Expenses categorized as Bills (under Necessities). Default range is the current calendar month — apply to refresh.",
  emptyState: {
    title: "No bills this month",
    description:
      "When you categorize an expense as Bills, it will show up here. You can also widen the date range.",
    icon: "bills",
    accentChartIndex: 5,
    primaryAction: { href: "/money", label: "Add bill expense" },
    secondaryAction: { href: "/money/settings/categories", label: "Manage categories" },
  },
  lockedQuery: {
    kinds: ["expense"],
  },
  lockedCategorySeed: {
    parentName: MONEY_SEED_NECESSITIES,
    name: MONEY_SEED_BILLS,
  },
  chart: {
    title: "Bills over time",
    description:
      "Cumulative bill expenses (income minus expenses) for the selected range.",
    compareHint: "Solid: this month through today. Dashed: prior month.",
  },
};

export const MONEY_LEDGER_SAVINGS: MoneyLedgerPreset = {
  title: "Savings",
  description:
    "Deposits, withdrawals, and interest on savings accounts. Default range is the current calendar month — apply to refresh.",
  emptyState: {
    title: "No savings activity",
    description:
      "Transfers and interest on savings accounts appear here. Try a wider date range if you expect older entries.",
    icon: "savings",
    accentChartIndex: 3,
    primaryAction: { href: "/money", label: "Record a transfer" },
  },
  lockedQuery: {
    accountTypes: ["savings"],
  },
  chart: {
    title: "Savings activity",
    description:
      "Cumulative net flow on savings accounts for the selected range.",
    compareHint: "Solid: this month through today. Dashed: prior month.",
  },
};

export const MONEY_LEDGER_INVESTMENT: MoneyLedgerPreset = {
  title: "Investments",
  description:
    "Activity on investment accounts (buys, sells, dividends, and cash movements). Default range is the current calendar month — apply to refresh.",
  emptyState: {
    title: "No investment account activity",
    description:
      "Cash movements on investment accounts show here. For holdings and trades, use Portfolio overview.",
    icon: "investment",
    accentChartIndex: 4,
    primaryAction: { href: "/money/investments/new", label: "Record activity" },
    secondaryAction: { href: "/money/investments/portfolio", label: "View portfolio" },
  },
  lockedQuery: {
    accountTypes: ["investment"],
  },
  chart: {
    title: "Investment cash flow",
    description:
      "Cumulative net cash movement on investment accounts for the selected range.",
    compareHint: "Solid: this month through today. Dashed: prior month.",
  },
};

export const MONEY_LEDGER_LOAN: MoneyLedgerPreset = {
  title: "Loans",
  description:
    "Transactions posted to loan accounts. Default range is the current calendar month — apply to refresh.",
  emptyState: {
    title: "No loan account transactions",
    description:
      "Payments and adjustments on loan accounts appear here. Set up schedules under Schedules & payments.",
    icon: "loan",
    accentChartIndex: 6,
    primaryAction: { href: "/money/loans/manage", label: "View loan schedules" },
    secondaryAction: { href: "/money/loans/new", label: "Create a loan" },
  },
  lockedQuery: {
    accountTypes: ["loan"],
  },
  chart: {
    title: "Loan account flow",
    description:
      "Cumulative net flow on loan accounts for the selected range.",
    compareHint: "Solid: this month through today. Dashed: prior month.",
  },
};

export const MONEY_LEDGER_SCOPES: readonly MoneyLedgerScopeOption[] = [
  { id: "all", label: "All", accentIndex: 1 },
  {
    id: "spending",
    label: "Spending",
    preset: MONEY_LEDGER_SPENDING,
    accentIndex: 0,
  },
  { id: "bills", label: "Bills", preset: MONEY_LEDGER_BILLS, accentIndex: 5 },
  {
    id: "savings",
    label: "Savings",
    preset: MONEY_LEDGER_SAVINGS,
    accentIndex: 3,
  },
  { id: "loans", label: "Loans", preset: MONEY_LEDGER_LOAN, accentIndex: 6 },
  {
    id: "investments",
    label: "Invest",
    preset: MONEY_LEDGER_INVESTMENT,
    accentIndex: 4,
  },
] as const;

const MONEY_LEDGER_SCOPE_BY_ID: Record<
  Exclude<MoneyLedgerScopeId, "all">,
  MoneyLedgerPreset
> = {
  spending: MONEY_LEDGER_SPENDING,
  bills: MONEY_LEDGER_BILLS,
  savings: MONEY_LEDGER_SAVINGS,
  loans: MONEY_LEDGER_LOAN,
  investments: MONEY_LEDGER_INVESTMENT,
};

export function moneyLedgerScopePreset(
  scopeId: MoneyLedgerScopeId,
): MoneyLedgerPreset | undefined {
  if (scopeId === "all") return undefined;
  return MONEY_LEDGER_SCOPE_BY_ID[scopeId];
}

export function moneyLedgerScopeDescription(scopeId: MoneyLedgerScopeId): string {
  if (scopeId === "all") {
    return "Spending, bills, savings, loan, and investment account activity in the selected range.";
  }
  return moneyLedgerScopePreset(scopeId)?.description ?? "";
}

export function buildMoneyAnalyticsFilterQuery(
  applied: AnalyticsFiltersValue,
  scopeId: MoneyLedgerScopeId,
  categories: ReadonlyArray<
    Pick<MoneyCategoryRow, "id" | "name" | "parentId">
  >,
): string {
  const base = buildQuery(applied);
  const preset = moneyLedgerScopePreset(scopeId);
  if (!preset) return base;
  const resolvedCategoryIds = resolveLedgerPresetCategoryIds(preset, categories);
  return mergeLedgerPresetQuery(
    base,
    preset,
    resolvedCategoryIds.length > 0 ? resolvedCategoryIds : undefined,
  );
}

export function parseMoneyLedgerScopeId(
  value: string | null | undefined,
): MoneyLedgerScopeId {
  if (
    value === "spending" ||
    value === "bills" ||
    value === "savings" ||
    value === "loans" ||
    value === "investments"
  ) {
    return value;
  }
  return "all";
}

export function resolveLedgerPresetCategoryIds(
  preset: MoneyLedgerPreset,
  categories: ReadonlyArray<
    Pick<MoneyCategoryRow, "id" | "name" | "parentId">
  >,
): string[] {
  const seed = preset.lockedCategorySeed;
  if (!seed) return preset.lockedQuery.categoryIds ?? [];
  const parent = categories.find(
    (c) => c.name === seed.parentName && c.parentId == null,
  );
  if (!parent) return [];
  const child = categories.find(
    (c) => c.name === seed.name && c.parentId === parent.id,
  );
  return child ? [child.id] : [];
}

export function mergeLedgerPresetQuery(
  filterQuery: string,
  preset: MoneyLedgerPreset,
  resolvedCategoryIds?: string[],
): string {
  const sp = new URLSearchParams(filterQuery);
  const { lockedQuery } = preset;
  if (lockedQuery.kinds?.length) {
    sp.delete("kinds");
    for (const k of lockedQuery.kinds) sp.append("kinds", k);
  }
  if (lockedQuery.accountTypes?.length) {
    sp.delete("accountTypes");
    for (const t of lockedQuery.accountTypes) sp.append("accountTypes", t);
  }
  if (lockedQuery.excludeAccountTypes?.length) {
    sp.delete("excludeAccountTypes");
    for (const t of lockedQuery.excludeAccountTypes) {
      sp.append("excludeAccountTypes", t);
    }
  }
  const categoryIds =
    resolvedCategoryIds?.length
      ? resolvedCategoryIds
      : lockedQuery.categoryIds;
  if (categoryIds?.length) {
    sp.delete("categoryIds");
    for (const id of categoryIds) sp.append("categoryIds", id);
  }
  return sp.toString();
}
