"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/** Square checkbox marker — `rounded-[4px]` on size-4 avoids a circular radio look. */
export function Checkbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
  className,
  disabled,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center justify-center",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={ariaLabel}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "inline-flex size-4 items-center justify-center rounded-[4px] border transition-[background-color,border-color,box-shadow] duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
          checked || indeterminate
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-background hover:border-foreground/40",
        )}
      >
        {checked ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-3">
            <path
              fillRule="evenodd"
              d="M16.704 5.296a1 1 0 0 1 0 1.408l-7.5 7.5a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 1 1 1.414-1.414L8.5 12.086l6.793-6.79a1 1 0 0 1 1.411 0Z"
              clipRule="evenodd"
            />
          </svg>
        ) : indeterminate ? (
          <span className="block h-0.5 w-2 rounded-full bg-current" />
        ) : null}
      </span>
    </label>
  );
}
