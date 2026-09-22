"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { BABY_HOME_BIG_CONTROL_MIN_H } from "@/lib/baby-home-control-height";
import { BABY_HOME_DONE_FACE_CLASS } from "@/lib/baby-home-done-flash";

type BabyQuickValueCardProps = {
  labelId: string;
  label: ReactNode;
  /** Hero face text (e.g. "120 ml"). */
  valueText: string;
  /** Quieter face subtitle — prefer next-due over band. */
  subtitle?: ReactNode;
  disabled?: boolean;
  onMore: () => void;
  onLess: () => void;
  onSave: () => void;
  moreLabel: string;
  lessLabel: string;
  icon?: ReactNode;
  /**
   * Icon-only Custom segment under ± (flush cluster). Prefer over underCard.
   */
  customControl?: ReactNode;
  /**
   * @deprecated Prefer customControl inside the cluster.
   */
  underCard?: ReactNode;
  /** Brief Done/Logged face override after save (~2s). */
  doneText?: string | null;
  className?: string;
};

/**
 * Bottle cluster: face → stacked ± → optional Custom icon. gap-0 flush borders.
 */
export const BabyQuickValueCard = forwardRef<
  HTMLButtonElement,
  BabyQuickValueCardProps
>(function BabyQuickValueCard(
  {
    labelId,
    label,
    valueText,
    subtitle,
    disabled,
    onMore,
    onLess,
    onSave,
    moreLabel,
    lessLabel,
    icon,
    customControl,
    underCard,
    doneText,
    className,
  },
  saveRef,
) {
  const busy = Boolean(disabled);
  const showDone = Boolean(doneText);
  const segment =
    "flex items-center justify-center rounded-none border-0 border-b border-border bg-surface text-foreground transition-colors fx-press fx-ripple hover:bg-secondary-hover";

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      data-layout="b1-bottle"
      data-done-flash={showDone || undefined}
      className={cn(
        "flex h-full min-h-20 flex-col gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface",
        className,
      )}
    >
      <button
        ref={saveRef}
        type="button"
        aria-disabled={busy || undefined}
        data-done-flash={showDone || undefined}
        onClick={() => {
          if (busy) return;
          onSave();
        }}
        className={cn(
          segment,
          "relative min-h-20 w-full flex-col gap-1 overflow-hidden px-2 py-3",
          showDone &&
            "border-transparent bg-accent text-accent-foreground hover:bg-accent-hover",
          busy && "opacity-50",
        )}
      >
        {icon ? (
          <span className={cn(showDone && "invisible")} aria-hidden={showDone || undefined}>
            {icon}
          </span>
        ) : null}
        <span
          id={labelId}
          className={cn("text-sm font-medium", showDone && "invisible")}
        >
          {label}
        </span>
        <span
          className={cn(
            "tabular-nums text-lg font-semibold",
            showDone && "invisible",
          )}
        >
          {valueText}
        </span>
        {!showDone && subtitle ? (
          <span className="text-xs text-muted">{subtitle}</span>
        ) : null}
        {showDone ? (
          <span data-face-slot="done" className={BABY_HOME_DONE_FACE_CLASS}>
            {doneText}
          </span>
        ) : null}
      </button>
      <div
        data-stepper-cluster
        className="flex w-full flex-col gap-0 border-b border-border"
      >
        <button
          type="button"
          aria-label={moreLabel}
          aria-disabled={busy || undefined}
          data-stepper="more"
          onClick={() => {
            if (busy) return;
            onMore();
          }}
          className={cn(
            segment,
            "min-h-11 w-full border-b text-base",
            busy && "opacity-50",
          )}
        >
          +
        </button>
        <button
          type="button"
          aria-label={lessLabel}
          aria-disabled={busy || undefined}
          data-stepper="less"
          onClick={() => {
            if (busy) return;
            onLess();
          }}
          className={cn(
            segment,
            "min-h-11 w-full border-b-0 text-base",
            busy && "opacity-50",
          )}
        >
          −
        </button>
      </div>
      {customControl ? (
        <div data-custom-slot className="min-h-11">
          {customControl}
        </div>
      ) : underCard ? (
        <div data-under-card className="min-h-11 border-t border-border p-2">
          {underCard}
        </div>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {doneText ?? valueText}
      </p>
    </div>
  );
});

export type BabyQuickSimpleCardProps = {
  labelId: string;
  label: ReactNode;
  valueText: ReactNode;
  subtitle?: ReactNode;
  disabled?: boolean;
  onPress: () => void;
  icon?: ReactNode;
  /** Primary fill when selected/running. */
  selected?: boolean;
  /** Brief Done face after save (~2s) — primary fill, hides idle value. */
  doneText?: string | null;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children">;

/** Single large care card (breast / sleep) — matches two stacked small tiles. */
export function BabyQuickSimpleCard({
  labelId,
  label,
  valueText,
  subtitle,
  disabled,
  onPress,
  icon,
  selected,
  doneText,
  className,
  ...rest
}: BabyQuickSimpleCardProps) {
  const busy = Boolean(disabled);
  const showDone = Boolean(doneText);
  const primary = Boolean(selected) || showDone;
  return (
    <button
      type="button"
      aria-disabled={busy || undefined}
      aria-pressed={primary || undefined}
      data-selected={primary || undefined}
      data-done-flash={showDone || undefined}
      onClick={() => {
        if (busy) return;
        onPress();
      }}
      aria-labelledby={labelId}
      className={cn(
        "relative flex w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[var(--radius-md)] border px-3 py-2 text-center fx-press fx-ripple transition-colors",
        BABY_HOME_BIG_CONTROL_MIN_H,
        primary
          ? "border-transparent bg-accent text-accent-foreground hover:bg-accent-hover"
          : "border-border bg-surface text-foreground hover:bg-secondary-hover",
        busy && "opacity-50",
        className,
      )}
      {...rest}
    >
      {/* Reserve idle slots on Done (invisible) so the card does not shrink. */}
      <span
        data-face-slot="icon"
        data-icon-collapsed={showDone ? "true" : undefined}
        className={cn(
          "flex min-h-6 items-center justify-center",
          showDone && "invisible",
        )}
        aria-hidden={showDone || undefined}
      >
        {icon}
      </span>
      <span
        id={labelId}
        data-face-slot="title"
        className={cn("text-sm font-medium", showDone && "invisible")}
      >
        {label}
      </span>
      <span
        data-face-slot="value"
        className={cn(
          "min-h-6 text-base font-semibold tabular-nums",
          showDone && "invisible",
        )}
      >
        {valueText}
      </span>
      {subtitle ? (
        <span
          data-face-slot="subtitle"
          className={cn(
            "min-h-4 text-xs",
            primary ? "text-accent-foreground/80" : "text-muted",
            showDone && "invisible",
          )}
        >
          {subtitle}
        </span>
      ) : null}
      {showDone ? (
        <span data-face-slot="done" className={BABY_HOME_DONE_FACE_CLASS}>
          {doneText}
        </span>
      ) : null}
    </button>
  );
}
