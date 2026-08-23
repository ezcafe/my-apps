"use client";

import { useMemo } from "react";
import { MoneyUsageQuickPick } from "@/components/money-usage-quick-pick";
import { formatMinor } from "@/lib/format-money";
import {
  categoriesOfKind,
  moneyCategoryById,
  moneyCategoryLabel,
} from "@/lib/money-category-ui";
import type { MoneyAccountLookup, MoneyCategoryLookup } from "@/lib/money-query-options";

export function InstrumentLedgerDefaultsFields({
  accounts,
  categories,
  moneyAccountId,
  incomeCategoryId,
  expenseCategoryId,
  onMoneyAccountId,
  onIncomeCategoryId,
  onExpenseCategoryId,
}: {
  accounts: readonly MoneyAccountLookup[];
  categories: readonly MoneyCategoryLookup[];
  moneyAccountId: string;
  incomeCategoryId: string;
  expenseCategoryId: string;
  onMoneyAccountId: (id: string) => void;
  onIncomeCategoryId: (id: string) => void;
  onExpenseCategoryId: (id: string) => void;
}) {
  const accountItems = useMemo(
    () =>
      accounts.map((a) => ({
        id: a.id,
        label: a.name,
        usageCount: a.usageCount,
      })),
    [accounts],
  );
  const categoryById = useMemo(
    () => moneyCategoryById([...categories]),
    [categories],
  );
  const incomeItems = useMemo(() => {
    const rows = categoriesOfKind(categories, "income");
    return rows.map((c) => ({
      id: c.id,
      label: moneyCategoryLabel(c, categoryById),
      usageCount: c.usageCount,
      isChild: Boolean(c.parentId),
    }));
  }, [categories, categoryById]);
  const expenseItems = useMemo(() => {
    const rows = categoriesOfKind(categories, "expense");
    return rows.map((c) => ({
      id: c.id,
      label: moneyCategoryLabel(c, categoryById),
      usageCount: c.usageCount,
      isChild: Boolean(c.parentId),
    }));
  }, [categories, categoryById]);

  return (
    <>
      <MoneyUsageQuickPick
        legend="Account"
        ariaLabel="Account"
        required
        items={accountItems}
        selectedId={moneyAccountId}
        onSelect={onMoneyAccountId}
        otherLabel="Other account"
        searchPlaceholder="Search accounts…"
        emptyMessage="No accounts yet."
        renderPickerRow={(item) => {
          const acc = accounts.find((a) => a.id === item.id);
          if (!acc) return null;
          return formatMinor(acc.balanceMinor, acc.currency);
        }}
      />
      <MoneyUsageQuickPick
        legend="Profit category"
        ariaLabel="Profit category"
        required
        items={incomeItems}
        selectedId={incomeCategoryId}
        onSelect={onIncomeCategoryId}
        otherLabel="Other profit category"
        searchPlaceholder="Search income categories…"
        emptyMessage="No income categories yet."
      />
      <MoneyUsageQuickPick
        legend="Loss category"
        ariaLabel="Loss category"
        required
        items={expenseItems}
        selectedId={expenseCategoryId}
        onSelect={onExpenseCategoryId}
        otherLabel="Other loss category"
        searchPlaceholder="Search expense categories…"
        emptyMessage="No expense categories yet."
      />
    </>
  );
}
