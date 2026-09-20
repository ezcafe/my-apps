"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { BABY_HOME_BIG_CONTROL_MIN_H } from "@/lib/baby-home-control-height";

export type BabyCustomTimeChipProps = {
  label: ReactNode;
  valueText: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  "data-testid"?: string;
  className?: string;
};

/** Nap-sized Custom time control — sibling beside Nap or Diaper 2×2. */
export function BabyCustomTimeChip({
  label,
  valueText,
  selected,
  disabled,
  onPress,
  "data-testid": testId,
  className,
}: BabyCustomTimeChipProps) {
  const busy = Boolean(disabled);
  return (
    <button
      type="button"
      data-testid={testId ?? "baby-custom-time-chip"}
      data-custom-time-chip=""
      data-selected={selected || undefined}
      aria-pressed={selected || undefined}
      aria-disabled={busy || undefined}
      onClick={() => {
        if (busy) return;
        onPress();
      }}
      className={cn(
        "relative flex w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[var(--radius-md)] border px-3 py-2 text-center fx-press fx-ripple fx-hit-40 transition-colors",
        BABY_HOME_BIG_CONTROL_MIN_H,
        selected
          ? "border-transparent bg-accent text-accent-foreground hover:bg-accent-hover"
          : "border-border bg-surface text-foreground hover:bg-secondary-hover",
        busy && "opacity-50",
        className,
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      {valueText ? (
        <span
          data-face-slot="value"
          className="min-h-6 text-base font-semibold tabular-nums"
        >
          {valueText}
        </span>
      ) : null}
    </button>
  );
}
