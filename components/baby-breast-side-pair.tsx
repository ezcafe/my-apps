"use client";

import type { ReactNode } from "react";
import {
  BabyTimedCareChip,
  type BabyTimedCareChipProps,
} from "@/components/baby-timed-care-chip";
import { IconBabyBreast } from "@/components/icons/icon-baby-nav";
import { IconSwap } from "@/components/ui/icon-swap";
import type { BabyBreastCareSide } from "@/lib/baby-breast-timer-store";
import { cn } from "@/lib/cn";

export type BabyBreastSideChipProps = {
  side: BabyBreastCareSide;
  label: ReactNode;
  running: boolean;
  elapsedText?: ReactNode;
  tapToStart: string;
  tapToStop: string;
  doneText?: string | null;
  subtitle?: ReactNode;
  helperText?: ReactNode;
  recovery?: ReactNode;
  disabled?: boolean;
  onPress: () => void;
  "data-testid"?: string;
  labelId?: string;
  icon?: BabyTimedCareChipProps["icon"];
};

export type BabyBreastSidePairProps = {
  sides: readonly [BabyBreastSideChipProps, BabyBreastSideChipProps];
  className?: string;
  /** When true, wrapper uses display:contents so chips join a parent grid. */
  asContents?: boolean;
};

/** Shared Breast L/R timed chips — Home + Feed. */
export function BabyBreastSidePair({
  sides,
  className,
  asContents = false,
}: BabyBreastSidePairProps) {
  return (
    <div
      className={cn(asContents ? "contents" : "grid gap-3", className)}
      style={
        asContents
          ? undefined
          : {
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
            }
      }
      data-testid="baby-breast-side-pair"
      data-layout="breast-side-pair"
    >
      {sides.map((s) => (
        <BabyTimedCareChip
          key={s.side}
          data-testid={s["data-testid"] ?? `baby-care-chip-${s.side}`}
          labelId={s.labelId ?? `baby-breast-${s.side}`}
          label={s.label}
          running={s.running}
          elapsedText={s.elapsedText}
          tapToStart={s.tapToStart}
          tapToStop={s.tapToStop}
          doneText={s.doneText}
          subtitle={s.subtitle}
          helperText={s.helperText}
          recovery={s.recovery}
          disabled={s.disabled}
          onPress={s.onPress}
          icon={
            s.icon ?? (
              <IconSwap
                active={s.running}
                activeIcon={
                  <IconBabyBreast className="size-6 text-accent-foreground" />
                }
                inactiveIcon={<IconBabyBreast className="size-6" />}
              />
            )
          }
        />
      ))}
    </div>
  );
}
