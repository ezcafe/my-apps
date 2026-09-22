"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { BABY_HOME_SMALL_GRID_MIN_H } from "@/lib/baby-home-control-height";
import { BABY_HOME_DONE_FACE_CLASS } from "@/lib/baby-home-done-flash";
import {
  IconBabyDiaperDry,
  IconBabyDiaperMixed,
  IconBabyDiaperPoop,
  IconBabyDiaperWet,
} from "@/components/icons/icon-baby-nav";
import {
  BABY_DIAPER_KIND_TILES,
  type BabyDiaperQuickPlan,
  planBabyDiaperKindTap,
} from "@/lib/baby-diaper-quick-plan";
import type { BabyDiaperKind } from "@/lib/baby-diaper-detail";

const SHORT_LABEL_KEY: Record<BabyDiaperKind, string> = {
  wet: "home.diaperTileWet",
  dirty: "home.diaperTilePoop",
  mixed: "home.diaperTileMixed",
  dry: "home.diaperTileDry",
};

const ARIA_KEY: Record<BabyDiaperKind, string> = {
  wet: "diaper.wet",
  dirty: "diaper.dirty",
  mixed: "diaper.mixed",
  dry: "diaper.dry",
};

/** Shared border edges for flush 2×2 (order: wet, dirty, mixed, dry). */
const TILE_EDGE: Record<BabyDiaperKind, string> = {
  wet: "border-r border-b",
  dirty: "border-b",
  mixed: "border-r",
  dry: "",
};

const KIND_ICON: Record<BabyDiaperKind, (props: { className?: string }) => ReactNode> = {
  wet: (p) => <IconBabyDiaperWet className={p.className} data-diaper-icon="wet" />,
  dirty: (p) => (
    <IconBabyDiaperPoop className={p.className} data-diaper-icon="dirty" />
  ),
  mixed: (p) => (
    <IconBabyDiaperMixed className={p.className} data-diaper-icon="mixed" />
  ),
  dry: (p) => <IconBabyDiaperDry className={p.className} data-diaper-icon="dry" />,
};

export type BabyDiaperKindControlProps = {
  disabled?: boolean;
  /** Brief Done on the saved kind tile — also reads as primary selected. */
  doneKind?: BabyDiaperKind | null;
  doneText?: string;
  onPlan: (plan: BabyDiaperQuickPlan) => void;
  t: (key: string) => string;
  className?: string;
};

/** Flush 2×2 Kind segmented control — gap-0, primary selected, fx-ripple. */
export function BabyDiaperKindControl({
  disabled,
  doneKind,
  doneText,
  onPlan,
  t,
  className,
}: BabyDiaperKindControlProps) {
  const busy = Boolean(disabled);

  return (
    <div
      role="group"
      aria-label={t("home.diaper")}
      data-layout="diaper-kind-2x2"
      data-done-kind={doneKind ?? undefined}
      className={cn(
        "grid grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface",
        BABY_HOME_SMALL_GRID_MIN_H,
        className,
      )}
    >
      {BABY_DIAPER_KIND_TILES.map((kind) => {
        const showDone = doneKind === kind && doneText;
        // Primary fill only during Done flash — no idle default on Wet.
        const selected = Boolean(showDone);
        const Icon = KIND_ICON[kind];
        return (
          <button
            key={kind}
            type="button"
            data-diaper-kind={kind}
            data-diaper-flash={showDone ? "done" : undefined}
            data-selected={selected || undefined}
            aria-label={t(ARIA_KEY[kind])}
            aria-pressed={selected || undefined}
            aria-disabled={busy || undefined}
            onClick={() => {
              if (busy) return;
              onPlan(planBabyDiaperKindTap(kind));
            }}
            className={cn(
              "relative flex min-h-11 min-w-0 flex-row items-center justify-center gap-1 rounded-none px-1 text-center fx-press fx-ripple transition-colors",
              TILE_EDGE[kind],
              "border-border",
              selected
                ? "bg-accent text-accent-foreground hover:bg-accent-hover"
                : "bg-surface text-foreground hover:bg-secondary-hover",
              busy && "opacity-50",
            )}
          >
            <span
              data-face-slot="idle"
              className={cn(
                "flex items-center justify-center gap-1",
                showDone && "invisible",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="text-sm font-medium tabular-nums">
                {t(SHORT_LABEL_KEY[kind])}
              </span>
            </span>
            {showDone ? (
              <span data-face-slot="done" className={BABY_HOME_DONE_FACE_CLASS}>
                {doneText}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
