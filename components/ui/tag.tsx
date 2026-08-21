import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Inline removable-style chip */
export function Tag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] border border-border bg-background px-2 py-1 text-sm font-medium text-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
