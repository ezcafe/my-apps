"use client";

import type { ReactNode } from "react";
import { BabyQuickSimpleCard } from "@/components/baby-quick-value-card";
import { cn } from "@/lib/cn";

export type BabyTimedCareChipProps = {
  labelId: string;
  label: ReactNode;
  icon?: ReactNode;
  /** Running = show elapsed + Tap to stop (never Done). */
  running: boolean;
  /** Elapsed face while running (string or live node). */
  elapsedText?: ReactNode;
  tapToStart: string;
  tapToStop: string;
  doneText?: string | null;
  subtitle?: ReactNode;
  helperText?: ReactNode;
  /**
   * Home-only recovery chrome (Retry/Discard). Dedicated slot — not inside
   * the muted helperText `<p>`.
   */
  recovery?: ReactNode;
  disabled?: boolean;
  onPress: () => void;
  className?: string;
  "data-testid"?: string;
};

/**
 * Shared chrome for timed care chips (Breast/Pump L·R, Nap/Sleep).
 * Adapters own start/stop — this only renders idle / running / Done.
 * Running title is merged by callers: `{endTitle} - {tapToStop}`.
 */
export function BabyTimedCareChip({
  labelId,
  label,
  icon,
  running,
  elapsedText,
  tapToStart,
  tapToStop,
  doneText,
  subtitle,
  helperText,
  recovery,
  disabled,
  onPress,
  className,
  "data-testid": testId,
}: BabyTimedCareChipProps) {
  // Running chrome wins — never paint Done over Tap to stop / elapsed.
  const showDone = Boolean(doneText) && !running;
  const valueText = running
    ? (elapsedText ?? tapToStart)
    : tapToStart;
  // Running stop copy lives in the title — subtitle only for extras (stale).

  return (
    <div
      className={cn("flex h-full flex-col gap-1", className)}
      data-testid={testId}
      data-timed-care-chip=""
      data-running={running ? "true" : undefined}
      data-done-flash={showDone ? "true" : undefined}
    >
      <BabyQuickSimpleCard
        labelId={labelId}
        label={label}
        valueText={valueText}
        subtitle={showDone ? undefined : subtitle}
        disabled={disabled}
        selected={running}
        doneText={showDone ? doneText : null}
        onPress={onPress}
        icon={icon}
        className={cn("fx-hit-40")}
        data-running={running ? "true" : undefined}
      />
      {helperText ? (
        <p className="text-xs text-muted">{helperText}</p>
      ) : null}
      {/* Recovery is already a rooted node from the caller — no extra wrapper. */}
      {recovery ?? null}
    </div>
  );
}

/** Pure copy pick for tests — running never uses Done / tapToSave. */
export function babyTimedCareChipRunningCopy(input: {
  running: boolean;
  tapToStart: string;
  tapToStop: string;
}): string {
  return input.running ? input.tapToStop : input.tapToStart;
}

/** Merged stop title on all timed chips: `{endTitle} - {tapToStop}`. */
export function babyTimedCareMergedStopTitle(
  endTitle: string,
  tapToStop: string,
): string {
  return `${endTitle} - ${tapToStop}`;
}

/** Idle vs running label — running uses merged stop title. */
export function babyTimedCareChipLabel(input: {
  running: boolean;
  idleLabel: string;
  endTitle: string;
  tapToStop: string;
}): string {
  if (!input.running) return input.idleLabel;
  return babyTimedCareMergedStopTitle(input.endTitle, input.tapToStop);
}
