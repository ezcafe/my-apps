import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Inline wizard/dashboard status with emphasized counts. */
export function MoneyStatusStrip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-sm text-muted fx-fade-in",
        className,
      )}
      role="status"
    >
      {children}
    </p>
  );
}

export function MoneyStatusEmphasis({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-semibold text-foreground tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  );
}
