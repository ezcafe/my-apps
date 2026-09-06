import { cn } from "@/lib/cn";

/** Border-box height matching Amount (`Input` / `InputGroup`: py-3 + text-base + 1px border). */
export const quickPickChipHeightCls = "h-[calc(1.5rem+1.5em+2px)]";

/** Segmented radiogroup shell wrapping quick-pick chips. */
export const quickPickGroupCls =
  "inline-flex min-w-0 flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1";

const chipFocusCls =
  "cursor-pointer focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press";

const chipSelectedCls =
  "border-accent bg-[color-mix(in_oklab,var(--accent)_16%,var(--surface))] text-foreground shadow-[var(--shadow-sm)]";

/** Top quick-pick chip inside a segmented radiogroup. */
export function quickPickChipCls(active: boolean) {
  return cn(
    "relative isolate inline-flex",
    quickPickChipHeightCls,
    "min-w-20 max-w-full items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border px-4 text-base font-medium transition-[background-color,color,box-shadow,border-color] duration-200",
    chipFocusCls,
    active
      ? chipSelectedCls
      : "border-transparent text-muted hover:bg-muted-surface hover:text-foreground",
  );
}

/** Opens a list / date picker — visually distinct from quick-pick chips. */
export function quickPickOtherChipCls(active: boolean) {
  return cn(
    "group/other relative isolate inline-flex",
    quickPickChipHeightCls,
    "min-w-0 max-w-full items-center overflow-hidden rounded-[var(--radius-sm)] border px-4 text-base font-medium transition-[background-color,color,box-shadow,border-color] duration-200",
    chipFocusCls,
    active
      ? chipSelectedCls
      : "border-border bg-background text-muted hover:border-[color-mix(in_oklab,var(--foreground)_16%,var(--border))] hover:bg-muted-surface/70 hover:text-foreground",
  );
}

/** @deprecated Prefer `quickPickChipHeightCls` — Money-era alias. */
export const moneyQuickPickChipHeightCls = quickPickChipHeightCls;
/** @deprecated Prefer `quickPickGroupCls` — Money-era alias. */
export const moneyQuickPickGroupCls = quickPickGroupCls;
/** @deprecated Prefer `quickPickChipCls` — Money-era alias. */
export const moneyQuickPickChipCls = quickPickChipCls;
/** @deprecated Prefer `quickPickOtherChipCls` — Money-era alias. */
export const moneyQuickPickOtherChipCls = quickPickOtherChipCls;
