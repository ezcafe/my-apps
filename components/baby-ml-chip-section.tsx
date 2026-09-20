"use client";

import type { ReactNode } from "react";
import {
  BabyBottleMlChips,
  type BabyBottleMlChipsProps,
} from "@/components/baby-bottle-ml-chips";
import { cn } from "@/lib/cn";

export type BabyMlChipSectionProps = BabyBottleMlChipsProps & {
  /** Optional muted helper under the chip grid. */
  helperText?: ReactNode;
  /** Pending Retry/Discard slot (Home). */
  recovery?: ReactNode;
  sectionClassName?: string;
  "data-section"?: string;
  /** Edit outside the flush 2×2 — reopen Custom ml modal. */
  onEditCustom?: () => void;
  showEditCustom?: boolean;
};

/** Bottle / pump-amount ml chips + optional helper + recovery. */
export function BabyMlChipSection({
  helperText,
  recovery,
  sectionClassName,
  "data-section": dataSection,
  className,
  onEditCustom,
  showEditCustom,
  ...chipProps
}: BabyMlChipSectionProps) {
  return (
    <div
      data-section={dataSection}
      data-testid="baby-ml-chip-section"
      className={cn("flex h-full min-h-14 min-w-0 flex-col gap-1", sectionClassName)}
    >
      <BabyBottleMlChips {...chipProps} className={className} />
      {showEditCustom && onEditCustom ? (
        <button
          type="button"
          data-testid="baby-custom-ml-edit"
          aria-label={chipProps.t("home.customMlEditAria")}
          disabled={chipProps.disabled}
          onClick={() => {
            if (chipProps.disabled) return;
            onEditCustom();
          }}
          className={cn(
            "fx-hit-40 fx-press min-h-11 self-start rounded-[var(--radius-sm)] px-3 text-sm text-accent transition-colors",
            chipProps.disabled && "opacity-50",
          )}
        >
          {chipProps.t("home.customMlEdit")}
        </button>
      ) : null}
      {helperText ? (
        <p className="text-xs text-muted">{helperText}</p>
      ) : null}
      {recovery}
    </div>
  );
}
