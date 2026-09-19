"use client";

import type { ReactNode } from "react";
import { MoneyUsageQuickPick } from "@/components/money-usage-quick-pick";
import { MoneyUsageMultiQuickPick } from "@/components/money-usage-multi-quick-pick";
import { cn } from "@/lib/cn";
import type { UsageRankedItem } from "@/lib/money-usage-quick-pick";

export type MoneyCategoryFieldProps = {
  legend: ReactNode;
  ariaLabel: string;
  required?: boolean;
  items: readonly UsageRankedItem[];
  pickerItems?: readonly UsageRankedItem[];
  pinnedItems?: readonly UsageRankedItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  otherLabel: string;
  searchPlaceholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  emptyCountsAsOther?: boolean;
  emptySelectedOnOther?: boolean;
  emptyMessage?: string;
  renderPickerRow?: (item: UsageRankedItem) => ReactNode;
  chipBudgetProgressPct?: (id: string) => number | undefined;
  compact?: boolean;
  hideLegend?: boolean;
  className?: string;
};

/** Single-select Category chrome (money/new Category + Growth Unit). */
export function MoneyCategoryField({
  className,
  ...props
}: MoneyCategoryFieldProps) {
  return (
    <div data-testid="money-category-field">
      <MoneyUsageQuickPick
        {...props}
        className={cn("[grid-column:1/-1]", className)}
      />
    </div>
  );
}

export type MoneyMultiCategoryFieldProps = {
  legend: ReactNode;
  ariaLabel: string;
  items: readonly UsageRankedItem[];
  pickerItems?: readonly UsageRankedItem[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
  otherLabel: string;
  compact?: boolean;
  emptyMessage?: string;
  className?: string;
};

/** Multi-select Category chrome (Growth Symptoms). */
export function MoneyMultiCategoryField({
  legend,
  ariaLabel,
  items,
  pickerItems,
  selectedIds,
  onChange,
  otherLabel,
  compact,
  emptyMessage,
  className,
}: MoneyMultiCategoryFieldProps) {
  return (
    <div data-testid="money-multi-category-field">
      <MoneyUsageMultiQuickPick
        legend={legend}
        ariaLabel={ariaLabel}
        items={items}
        pickerItems={pickerItems}
        value={selectedIds}
        onChange={onChange}
        otherLabel={otherLabel}
        compact={compact}
        emptyMessage={emptyMessage}
        className={cn("[grid-column:1/-1]", className)}
      />
    </div>
  );
}
