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
};

/** Bottle / pump-amount ml chips + optional helper + recovery. */
export function BabyMlChipSection({
  helperText,
  recovery,
  sectionClassName,
  "data-section": dataSection,
  className,
  ...chipProps
}: BabyMlChipSectionProps) {
  return (
    <div
      data-section={dataSection}
      data-testid="baby-ml-chip-section"
      className={cn("flex h-full min-h-14 min-w-0 flex-col gap-1", sectionClassName)}
    >
      <BabyBottleMlChips {...chipProps} className={className} />
      {helperText ? (
        <p className="text-xs text-muted">{helperText}</p>
      ) : null}
      {recovery}
    </div>
  );
}
