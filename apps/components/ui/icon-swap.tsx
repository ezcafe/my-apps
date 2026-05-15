import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type IconSwapProps = {
  /** When true, renders `active`; otherwise renders `inactive`. */
  active: boolean;
  /** The icon shown when `active` is true. */
  activeIcon: ReactNode;
  /** The icon shown when `active` is false. */
  inactiveIcon: ReactNode;
  /** Optional accessible label spoken by AT. */
  "aria-label"?: string;
  className?: string;
};

/**
 * Cross-fade between two icons with scale + blur (skill: contextual
 * icon animations). Both icons stay mounted; the inactive one is
 * absolutely positioned so layout never shifts. CSS-only — see
 * `.fx-icon-swap` in `app/globals.css`.
 *
 * Use for stateful icon swaps (play/pause, like/liked, expand/collapse,
 * theme toggles, copy → check). Don't use for purely decorative icons.
 */
export function IconSwap({
  active,
  activeIcon,
  inactiveIcon,
  "aria-label": ariaLabel,
  className,
}: IconSwapProps) {
  return (
    <span
      className={cn("fx-icon-swap", className)}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <span data-active={String(active)}>{activeIcon}</span>
      <span data-active={String(!active)}>{inactiveIcon}</span>
    </span>
  );
}
