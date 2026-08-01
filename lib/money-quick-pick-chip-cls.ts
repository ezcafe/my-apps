import { cn } from "@/lib/cn";

/** Top quick-pick chip inside a segmented radiogroup. */
export function moneyQuickPickChipCls(active: boolean) {
  return cn(
    "relative isolate min-w-20 max-w-full overflow-hidden rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press",
    active ? "bg-surface shadow-[var(--shadow-sm)]" : "hover:bg-muted-surface",
    active ? "text-foreground" : "text-muted hover:text-foreground",
  );
}

/** Opens a list / date picker — visually distinct from quick-pick chips. */
export function moneyQuickPickOtherChipCls(active: boolean) {
  return cn(
    "group/other relative isolate inline-flex min-w-0 max-w-full items-center overflow-hidden rounded-[var(--radius-sm)] border px-2 py-1 text-sm font-medium transition-[background-color,color,box-shadow,border-color] duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press",
    active
      ? "border-[color-mix(in_oklab,var(--accent)_38%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_11%,var(--surface))] text-foreground shadow-[var(--shadow-sm)]"
      : "border-border bg-background text-muted hover:border-[color-mix(in_oklab,var(--foreground)_16%,var(--border))] hover:bg-muted-surface/70 hover:text-foreground",
  );
}
