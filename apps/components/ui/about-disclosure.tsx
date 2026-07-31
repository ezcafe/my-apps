"use client";

import { type ReactNode, useState } from "react";
import { cn } from "@/lib/cn";

/** Collapsed-by-default help / description disclosure (“About”). */
export function AboutDisclosure({
  children,
  label = "About",
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("mt-1", className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors duration-200 hover:text-foreground fx-press"
      >
        {label}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        >
          <path
            fillRule="evenodd"
            d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open ? (
        <div className="mt-2 max-w-prose text-sm leading-6 text-muted fx-fade-in">
          {children}
        </div>
      ) : null}
    </div>
  );
}
