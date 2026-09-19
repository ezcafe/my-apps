import type { ReactNode } from "react";
import type { BabyActivityBorderCue } from "@/lib/baby-activity-regular-cue";
import type { BabyActivityAccentFamily } from "@/lib/baby-activity-color";
import { babyActivityAccentCssVar } from "@/lib/baby-activity-color";
import { cn } from "@/lib/cn";

export function babyActivityAccentStyle(
  family: BabyActivityAccentFamily,
): { color: string } {
  return { color: `var(${babyActivityAccentCssVar(family)})` };
}

/** Left accent bar + optional comparison chip border classes. */
export function babyActivityCueChromeClass(
  border: BabyActivityBorderCue,
): string {
  if (border === "none") {
    return "border-[color-mix(in_oklab,currentColor_45%,var(--border))]";
  }
  if (border === "below") {
    return "border-[color-mix(in_oklab,currentColor_55%,#38bdf8)] border-dashed";
  }
  if (border === "above") {
    return "border-[color-mix(in_oklab,currentColor_55%,#fb923c)] border-2";
  }
  return "border-[currentColor]";
}

const ACCENT_BAR_MAX_PX = 40; // h-10

export function BabyActivityAccentBar({
  family,
  fillRatio,
  className,
}: {
  family: BabyActivityAccentFamily;
  /** 0–1 vs age midpoint; null/undefined → full bar. */
  fillRatio?: number | null;
  className?: string;
}) {
  const ratio =
    fillRatio == null || !Number.isFinite(fillRatio)
      ? 1
      : Math.min(1, Math.max(0, fillRatio));
  const heightPx = Math.max(4, Math.round(ACCENT_BAR_MAX_PX * ratio));
  return (
    <span
      aria-hidden
      data-activity-accent={family}
      data-fill-ratio={ratio.toFixed(2)}
      className={cn(
        "mt-0.5 inline-block w-1.5 shrink-0 rounded-full bg-[currentColor]",
        className,
      )}
      style={{
        ...babyActivityAccentStyle(family),
        height: `${heightPx}px`,
      }}
    />
  );
}

export function BabyActivityTypeChip({
  family,
  border,
  children,
  cueLabel,
}: {
  family: BabyActivityAccentFamily;
  border: BabyActivityBorderCue;
  children: ReactNode;
  cueLabel?: string;
}) {
  return (
    <span
      data-activity-cue={border}
      data-activity-family={family}
      aria-label={cueLabel}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border bg-[color-mix(in_oklab,currentColor_14%,var(--surface))]",
        babyActivityCueChromeClass(border),
      )}
      style={babyActivityAccentStyle(family)}
    >
      {children}
    </span>
  );
}
