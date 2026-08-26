"use client";

import { type ReactNode, useId } from "react";
import { cn } from "@/lib/cn";

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM9.25 7.25a.75.75 0 0 0 1.5 0 .75.75 0 0 0-1.5 0ZM10 9a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5A.75.75 0 0 0 10 9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Page/section help: info icon beside the title; description appears in a
 * hover/focus tooltip (keyboard via focus-within; tap focuses on touch).
 */
export function AboutDisclosure({
  children,
  label = "About this page",
  className,
  compact = false,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
  /** Match text-sm metric labels (~20px) instead of a 28px hit box in-flow. */
  compact?: boolean;
}) {
  const tooltipId = useId();

  return (
    <span className={cn("group relative inline-flex shrink-0", className)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        className={cn(
          "inline-flex items-center justify-center rounded-[var(--radius-sm)] text-muted transition-colors duration-200 hover:bg-muted-surface hover:text-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-hit-40 fx-press",
          compact ? "size-5" : "size-7",
        )}
      >
        <InfoIcon className={compact ? "size-3.5" : "size-4"} />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 w-max max-w-[min(20rem,calc(100vw-2rem))] rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-left text-sm leading-5 text-muted shadow-[var(--shadow-md)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {children}
      </span>
    </span>
  );
}
