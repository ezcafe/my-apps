import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  children,
  className,
  required: req,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label
      className={cn(
        "fx-field fx-field-underline grid gap-1.5 text-sm focus-within:[&_.fx-field-label]:text-foreground",
        className,
      )}
    >
      <span className="fx-field-label text-muted transition-colors duration-200">
        {req ? (
          <>
            <span className="text-foreground" aria-hidden>
              *
            </span>{" "}
          </>
        ) : null}
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
