"use client";

import { cn } from "@/lib/cn";
import { BABY_HOME_SMALL_GRID_MIN_H } from "@/lib/baby-home-control-height";

export type BabyBottleMlChipsProps = {
  mls: number[];
  /** Matching chip primary fill — only during done flash or pending Custom. */
  selectedMl: number | null;
  /** ~2s done flash after save — keeps matching chip primary. */
  doneFlash?: boolean;
  doneText?: string;
  disabled?: boolean;
  onSelectMl: (ml: number) => void;
  onCustom: () => void;
  customSelected?: boolean;
  t: (key: string) => string;
  className?: string;
  /** Accessible group name — defaults to Bottle header. */
  groupLabel?: string;
};

/** Shared border edges for flush 2×2 (order: ml0, ml1, ml2, custom). */
const TILE_EDGE = [
  "border-r border-b",
  "border-b",
  "border-r",
  "",
] as const;

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

/**
 * Kind-like flush bottle ml chips + Custom in a 2×2 grid (same as Diaper).
 * gap-0 border, primary selected, fx-ripple, ≥44 hit.
 */
export function BabyBottleMlChips({
  mls,
  selectedMl,
  doneFlash,
  doneText,
  disabled,
  onSelectMl,
  onCustom,
  customSelected,
  t,
  className,
  groupLabel,
}: BabyBottleMlChipsProps) {
  const busy = Boolean(disabled);
  const chips = [...mls, "custom" as const];

  return (
    <div
      role="group"
      aria-label={groupLabel ?? t("home.header.bottle")}
      data-layout="bottle-ml-chips"
      data-done-flash={doneFlash || undefined}
      className={cn(
        "grid grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface",
        BABY_HOME_SMALL_GRID_MIN_H,
        className,
      )}
    >
      {chips.map((chip, index) => {
        const isCustom = chip === "custom";
        const ml = isCustom ? null : chip;
        const selected = isCustom
          ? Boolean(customSelected)
          : !customSelected && selectedMl != null && ml === selectedMl;
        const showDone = Boolean(
          doneFlash &&
            doneText &&
            (isCustom ? Boolean(customSelected) : selected),
        );
        return (
          <button
            key={isCustom ? "custom" : `ml-${ml}`}
            type="button"
            data-bottle-ml={isCustom ? "custom" : ml}
            data-selected={selected || undefined}
            data-bottle-flash={showDone ? "done" : undefined}
            aria-label={
              isCustom
                ? t("home.formulaCustomOpen")
                : fill(t("home.chipMl"), { ml: String(ml) })
            }
            aria-pressed={selected || undefined}
            aria-disabled={busy || undefined}
            onClick={() => {
              if (busy) return;
              if (isCustom) onCustom();
              else onSelectMl(ml!);
            }}
            className={cn(
              "relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-none px-1 text-center text-sm font-medium tabular-nums text-foreground fx-press fx-ripple transition-colors",
              TILE_EDGE[index] ?? "",
              "border-border",
              selected
                ? "bg-accent text-accent-foreground hover:bg-accent-hover"
                : "bg-surface hover:bg-secondary-hover",
              busy && "opacity-50",
            )}
          >
            <span
              data-face-slot="value"
              className={cn(showDone && "invisible")}
            >
              {isCustom
                ? t("home.formulaCustom")
                : fill(t("home.chipMl"), { ml: String(ml) })}
            </span>
            {showDone ? (
              <span
                data-face-slot="done"
                data-bottle-flash-label=""
                className="absolute inset-0 flex items-center justify-center text-sm font-medium"
              >
                {doneText}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
