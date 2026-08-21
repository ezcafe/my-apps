import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  error,
  children,
  className,
  required: req,
}: {
  label: ReactNode;
  hint?: ReactNode;
  /** Error message below the control (takes precedence over hint). */
  error?: ReactNode;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={cn("grid gap-2 text-base", className)}>
      <span className="text-sm font-medium text-foreground">
        {req ? (
          <>
            <span className="text-destructive" aria-hidden>
              *
            </span>{" "}
          </>
        ) : null}
        {label}
      </span>
      {children}
      {error ? (
        <span className="text-sm text-destructive">{error}</span>
      ) : hint ? (
        <span className="text-sm text-muted">{hint}</span>
      ) : null}
    </label>
  );
}
